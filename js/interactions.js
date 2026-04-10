// User interaction handling - object spawning, selection, etc
// Manages drop mode, object preview, mouse/touch events

class InteractionSystem {
    constructor(objectManager, physics, renderer) {
        this.om = objectManager;
        this.physics = physics;
        this.renderer = renderer;

        this.selected = null;
        this.dropMode = false;
        this.currentType = null;
        this.preview = null;
        this.previewData = null;
        
        this.isHolding = false;
        this.holdStart = 0;

        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.lastMouse = { x: 0, y: 0 };

        this.setupEventListeners();
    }

    setupEventListeners() {
        const canvas = document.getElementById('canvas');
        canvas.addEventListener('mousemove', e => this.onMouseMove(e));
        canvas.addEventListener('mousedown', e => this.onMouseDown(e));
        canvas.addEventListener('mouseup', e => this.onMouseUp(e));
        canvas.addEventListener('touchmove', e => this.onTouchMove(e), { passive: false });
        canvas.addEventListener('touchstart', e => this.onTouchStart(e), { passive: false });
        canvas.addEventListener('touchend', e => this.onTouchEnd(e));
        this.setupObjectDropButtons();

        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'd') {
                this.om.toggleDestructionMode();
                this.showNotification(this.om.destructionMode ? 'Destroy mode ON' : 'Destroy mode OFF', 1200);
            }
        });
    }

    setupObjectDropButtons() {
        const types = ['sphere', 'box', 'cylinder', 'cone', 'pyramid', 'capsule', 'torus', 'icosahedron'];
        types.forEach(type => {
            const btn = document.getElementById(`btn-drop-${type}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.dropObjectTypeFromHeight(type);
                });
            }
        });
    }

    getConfiguredDropHeight() {
        const heightInput = document.getElementById('input-drop-height');
        const parsed = parseFloat(heightInput?.value);
        if (!Number.isFinite(parsed)) return 60;
        return Math.max(10, Math.min(500, parsed));
    }

    dropObjectTypeFromHeight(type) {
        const mass = parseFloat(document.getElementById('input-mass')?.value) || 10;
        const size = parseFloat(document.getElementById('input-size')?.value) || 1;
        const dropHeight = this.getConfiguredDropHeight();

        // Add slight spread so repeated drops are less perfectly stacked.
        const spread = Math.max(0.4, size * 0.9);
        const pos = new window.CANNON.Vec3(
            (Math.random() - 0.5) * spread,
            dropHeight,
            (Math.random() - 0.5) * spread
        );
        this.om.createObject(type, pos, mass, size);

        const inf = document.getElementById('selected-object-info');
        const txt = document.getElementById('selected-object-text');
        if (inf && txt) {
            txt.textContent = `Dropped: ${type} | Mass: ${mass}kg | Height: ${dropHeight}`;
            inf.style.display = 'block';
        }
    }

    enterDropMode(type) {
        this.dropMode = true;
        this.currentType = type;
        this.previewData = {
            type: type,
            mass: parseFloat(document.getElementById('input-mass').value) || 10,
            size: parseFloat(document.getElementById('input-size').value) || 1
        };
        
        const types = ['sphere', 'box', 'cylinder', 'cone', 'pyramid', 'capsule', 'torus', 'icosahedron'];
        types.forEach(t => {
            const b = document.getElementById(`btn-drop-${t}`);
            if (b) {
                b.style.background = t === type ? '#ff6b35' : 'transparent';
                b.style.opacity = t === type ? '1' : '0.7';
            }
        });
    }

    cancelDropMode() {
        this.dropMode = false;
        this.currentType = null;
        this.previewData = null;
        
        if (this.preview) {
            this.renderer.scene.remove(this.preview);
            this.preview = null;
        }
        
        const types = ['sphere', 'box', 'cylinder', 'cone', 'pyramid', 'capsule', 'torus', 'icosahedron'];
        types.forEach(t => {
            const b = document.getElementById(`btn-drop-${t}`);
            if (b) { b.style.background = 'transparent'; b.style.opacity = '0.7'; }
        });
    }

    onMouseMove(e) {
        const canvas = document.getElementById('canvas');
        this.mouse.x = (e.clientX / canvas.clientWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / canvas.clientHeight) * 2 + 1;

        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.lastMouse = { x: e.clientX, y: e.clientY };

        this.raycaster.setFromCamera(this.mouse, this.renderer.camera);

        if (this.dropMode && !this.preview) this.createObjectPreview();
        if (this.preview) {
            const wp = this.getWorldPointAtMouse();
            if (wp) this.preview.position.set(wp.x, wp.y + 5, wp.z);
        }

        this.updateObjectHover();
    }

    createObjectPreview() {
        if (!this.previewData) return;
        
        const type = this.previewData.type;
        const size = this.previewData.size * 2;
        
        let geom;
        switch (type) {
            case 'sphere': geom = new THREE.SphereGeometry(size, 16, 16); break;
            case 'box': geom = new THREE.BoxGeometry(size, size * 0.7, size); break;
            case 'cylinder': geom = new THREE.CylinderGeometry(size / 2, size / 2, size * 2, 16); break;
            case 'cone': geom = new THREE.ConeGeometry(size / 2, size * 2, 16); break;
            case 'pyramid': geom = new THREE.ConeGeometry(size / 2, size, 4); break;
            case 'capsule': geom = new THREE.CapsuleGeometry(size / 2, size * 2.5, 4, 8); break;
            case 'torus': geom = new THREE.TorusGeometry(size, size * 0.25, 8, 32); break;
            case 'icosahedron': geom = new THREE.IcosahedronGeometry(size, 4); break;
            default: return;
        }
        
        const mat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.5, wireframe: true });
        this.preview = new THREE.Mesh(geom, mat);
        this.renderer.scene.add(this.preview);
    }

    rotateCameraWithMouse(deltaX, deltaY) {
        const rotationSpeed = 0.01;
        const camera = this.renderer.camera;
        const target = new THREE.Vector3(0, 10, 0);
        
        const offset = new THREE.Vector3(0, 0, 0);
        offset.subVectors(camera.position, target);
        
        const radius = offset.length();
        let theta = Math.atan2(offset.x, offset.z);
        let phi = Math.acos(offset.y / radius);
        
        theta -= deltaX * rotationSpeed;
        phi += deltaY * rotationSpeed;
        
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
        
        offset.setFromSphericalCoords(radius, phi, theta);
        camera.position.addVectors(target, offset);
        camera.lookAt(target);
    }

    onMouseDown(e) {
        this.isHolding = true;
        this.holdStart = Date.now();
        const canvas = document.getElementById('canvas');
        this.mouse.x = (e.clientX / canvas.clientWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / canvas.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.renderer.camera);

        // Drop object in drop mode
        if (this.dropMode && e.button === 0) {
            const wp = this.getWorldPointAtMouse();
            if (wp) {
                const pos = new window.CANNON.Vec3(wp.x, wp.y + 5, wp.z);
                this.om.createObject(this.previewData.type, pos, this.previewData.mass, this.previewData.size);
            }
            return;
        }

        // No scene-click behavior in normal mode.
        if (e.button === 0 && !this.dropMode) {
            return;
        }
    }

    selectObject(id, obj) {
        this.selected = { id, mesh: obj.mesh, body: obj.physicsBody, type: obj.type };
        this.highlightMesh(obj.mesh, true);
        this.showObjectInfo(obj);
    }

    deselectObject() {
        if (this.selected) {
            this.highlightMesh(this.selected.mesh, false);
            this.selected = null;
            const info = document.getElementById('selected-object-info');
            if (info) info.style.display = 'none';
        }
    }

    getWorldPointAtMouse() {
        const d = this.raycaster.ray.direction;
        const o = this.raycaster.ray.origin;
        const groundY = -25;
        const t = (groundY - o.y) / d.y;
        return t > 0 ? new THREE.Vector3(o.x + d.x * t, groundY, o.z + d.z * t) : null;
    }

    onMouseUp(e) {
        this.isHolding = false;
    }

    updateObjectHover() {
        // Scene hover does not select/highlight objects.
        document.body.style.cursor = 'default';
    }

    highlightMesh(mesh, hl) {
        if (!mesh?.material) return;
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => { m.emissive.setHex(hl ? 0x444444 : 0); m.emissiveIntensity = hl ? 0.5 : 0; });
        } else {
            mesh.material.emissive.setHex(hl ? 0x444444 : 0);
            mesh.material.emissiveIntensity = hl ? 0.5 : 0;
        }
    }

    showObjectInfo(obj, dropHeight = null) {
        const inf = document.getElementById('selected-object-info');
        const txt = document.getElementById('selected-object-text');
        if (inf && txt) {
            txt.textContent = `Selected: ${obj.type} | Mass: ${obj.mass || '?'}kg`;
            inf.style.display = 'block';
        }
    }

    showNotification(message, duration = 2000) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #ff6b35;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 0.9rem;
            z-index: 200;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    onTouchMove(e) {
        if (e.touches.length === 0) return;
        const touch = e.touches[0];
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        const rx = touch.clientX - rect.left, ry = touch.clientY - rect.top;
        
        this.mouse.x = (rx / rect.width) * 2 - 1;
        this.mouse.y = -(ry / rect.height) * 2 + 1;
        this.lastMouse = { x: touch.clientX, y: touch.clientY };

        this.raycaster.setFromCamera(this.mouse, this.renderer.camera);

        if (this.dropMode && !this.preview) this.createObjectPreview();
        if (this.preview) {
            const wp = this.getWorldPointAtMouse();
            if (wp) this.preview.position.set(wp.x, wp.y + 5, wp.z);
        }
        this.updateObjectHover();
    }

    onTouchStart(e) {
        if (e.touches.length === 0) return;
        const touch = e.touches[0];
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        
        this.isHolding = true;
        this.holdStart = Date.now();
        const rx = touch.clientX - rect.left, ry = touch.clientY - rect.top;
        
        this.mouse.x = (rx / rect.width) * 2 - 1;
        this.mouse.y = -(ry / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.renderer.camera);

        if (this.dropMode) {
            const wp = this.getWorldPointAtMouse();
            if (wp) {
                const pos = new window.CANNON.Vec3(wp.x, wp.y + 5, wp.z);
                this.om.createObject(this.previewData.type, pos, this.previewData.mass, this.previewData.size);
            }
            return;
        }

        // No scene-tap behavior in normal mode.
        return;
    }

    onTouchEnd(e) {
        this.isHolding = false;
    }
}

window.InteractionSystem = InteractionSystem;

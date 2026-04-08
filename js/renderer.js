// Wraps Three.js - handles rendering, camera, lighting

class ThreeRenderer {
    constructor() {
        this.scene = new THREE.Scene();
        
        const canvas = document.getElementById('canvas');
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 50000);
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });

        // Camera state
        this.cameraDistance = 70;
        this.cameraTarget = new THREE.Vector3(0, 15, 0);
        this.isDragging = false;
        this.isRightDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.cameraRotation = { x: 0.6, y: 0 };
        this.lastPinchDistance = null;

        // Ground settings
        this.groundSize = 200;
        this.groundWidth = 200;
        this.groundHeight = 200;
        this.groundMesh = null;
        this.gridHelper = null;

        this.zoomSensitivity = 1;
        this.cameraControlEnabled = true;

        // Wire everything up
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLighting();
        this.setupGround();
        this.setupCameraControls();
    }

    getMaxZoomDistance() {
        const avgGroundSize = (this.groundWidth + this.groundHeight) / 2;
        return Math.max(2000, avgGroundSize * 10); // allow zooming way out
    }

    setZoomSensitivity(sensitivity) {
        this.zoomSensitivity = Math.max(0.5, Math.min(5, sensitivity));
    }

    setupScene() {
        this.scene.background = new THREE.Color(0x0a0a15);
    }

    setupCamera() {
        this.updateCameraPosition();
        this.camera.lookAt(this.cameraTarget);
    }

    updateCameraPosition() {
        const x = Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x) * this.cameraDistance;
        const y = Math.sin(this.cameraRotation.x) * this.cameraDistance + this.cameraTarget.y;
        const z = Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x) * this.cameraDistance;

        this.camera.position.set(
            this.cameraTarget.x + x,
            y,
            this.cameraTarget.z + z
        );
        this.camera.lookAt(this.cameraTarget);
    }

    setCameraDistance(distance) {
        const maxZoom = this.getMaxZoomDistance();
        this.cameraDistance = Math.max(20, Math.min(maxZoom, distance));
        
        const zoomInput = document.getElementById('input-zoom');
        if (zoomInput) {
            zoomInput.max = maxZoom;
        }
        
        this.updateCameraPosition();
    }

    panCameraX(delta) {
        this.cameraTarget.x += delta * 0.5;
        this.updateCameraPosition();
    }

    panCameraY(delta) {
        this.cameraTarget.y += delta * 0.5;
        this.updateCameraPosition();
    }

    panCameraZ(delta) {
        this.cameraTarget.z += delta * 0.5;
        this.updateCameraPosition();
    }

    setupRenderer() {
        const canvas = document.getElementById('canvas');
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        // Set renderer size and pixel ratio for proper mobile rendering
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Set viewport to match canvas dimensions (important for proper camera frustum)
        this.renderer.setViewport(0, 0, width, height);
        
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
        
        // Handle window resize and orientation changes
        const updateCanvasSize = () => {
            const newWidth = canvas.clientWidth;
            const newHeight = canvas.clientHeight;
            this.renderer.setSize(newWidth, newHeight);
            this.renderer.setViewport(0, 0, newWidth, newHeight);
            this.camera.aspect = newWidth / newHeight;
            this.camera.updateProjectionMatrix();
        };

        // Listen for regular resize events
        window.addEventListener('resize', updateCanvasSize);
        
        // Also listen for fullscreen changes (handles mobile fullscreen)
        document.addEventListener('fullscreenchange', updateCanvasSize);
        document.addEventListener('webkitfullscreenchange', updateCanvasSize);
        document.addEventListener('mozfullscreenchange', updateCanvasSize);
        document.addEventListener('msfullscreenchange', updateCanvasSize);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.85);
        directionalLight.position.set(60, 80, 40);
        directionalLight.castShadow = true;

        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.far = 1000;
        directionalLight.shadow.camera.left = -500;
        directionalLight.shadow.camera.right = 500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;
        directionalLight.shadow.bias = -0.0002;

        this.scene.add(directionalLight);
        this.directionalLight = directionalLight;

        const pointLight = new THREE.PointLight(0xff6b35, 0.6, 300);
        pointLight.position.set(50, 60, 50);
        pointLight.castShadow = true;
        this.scene.add(pointLight);

        const backLight = new THREE.DirectionalLight(0x00d4ff, 0.2);
        backLight.position.set(-60, 40, -60);
        this.scene.add(backLight);
    }

    setupGround() {
        const groundGeometry = new THREE.PlaneGeometry(this.groundWidth, this.groundHeight);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x0f1322,
            metalness: 0.2,
            roughness: 0.8,
            side: THREE.DoubleSide
        });

        this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundMesh.rotation.x = -Math.PI / 2;
        this.groundMesh.position.y = -25;
        this.groundMesh.receiveShadow = true;
        this.groundMesh.castShadow = false;

        this.scene.add(this.groundMesh);

        // Add a grid for visual reference (subtle)
        this.addGridHelper();
    }

    /**
     * Add a subtle grid to the ground for better depth perception
     */
    addGridHelper() {
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
        }
        const avgSize = (this.groundWidth + this.groundHeight) / 2;
        const divisions = Math.floor(avgSize / 10);
        this.gridHelper = new THREE.GridHelper(avgSize, divisions, 0x2a2f4a, 0x1a1f3a);
        this.gridHelper.position.y = -24.9;
        this.scene.add(this.gridHelper);
    }

    updateGroundDimensions(width, height) {
        this.groundWidth = Math.max(200, Math.min(1000, width));
        this.groundHeight = Math.max(200, Math.min(1000, height));
        this.groundSize = Math.max(this.groundWidth, this.groundHeight);
        console.log(`Ground updated to ${this.groundWidth}x${this.groundHeight}`);

        if (this.groundMesh) {
            this.scene.remove(this.groundMesh);
        }

        this.setupGround();

        const maxZoom = this.getMaxZoomDistance();
        console.log('Max zoom distance now:', maxZoom);
    }

    setupCameraControls() {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', (e) => {
            if (!this.cameraControlEnabled) return;
            
            if (e.button === 0) { // Left mouse button
                this.isDragging = true;
            } else if (e.button === 2) { // Right mouse button
                this.isRightDragging = true;
            }
            this.dragStart = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!this.cameraControlEnabled) return;
            
            if (this.isDragging) {
                const deltaX = e.clientX - this.dragStart.x;
                const deltaY = e.clientY - this.dragStart.y;

                // Rotate camera around target
                this.cameraRotation.y += deltaX * 0.005;
                this.cameraRotation.x -= deltaY * 0.005;

                // Clamp vertical rotation
                this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));

                this.updateCameraPosition();
                this.dragStart = { x: e.clientX, y: e.clientY };
            }

            if (this.isRightDragging) {
                const deltaX = e.clientX - this.dragStart.x;
                const deltaY = e.clientY - this.dragStart.y;

                // Pan camera
                const panSpeed = 0.1;
                const upVector = new THREE.Vector3(0, 1, 0);
                const rightVector = new THREE.Vector3();
                rightVector.crossVectors(this.camera.getWorldDirection(new THREE.Vector3()), upVector).normalize();

                this.cameraTarget.addScaledVector(rightVector, -deltaX * panSpeed);
                this.cameraTarget.y += deltaY * panSpeed;

                this.updateCameraPosition();
                this.dragStart = { x: e.clientX, y: e.clientY };
            }
        });

        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.isRightDragging = false;
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            const maxZoom = this.getMaxZoomDistance();
            const groundSizeScale = Math.max(this.groundWidth, this.groundHeight) / 200;
            const effectiveSensitivity = this.zoomSensitivity * groundSizeScale;
            const zoomSpeed = 5 * effectiveSensitivity;
            
            this.cameraDistance += e.deltaY * 0.25 * zoomSpeed;
            this.cameraDistance = Math.max(10, Math.min(maxZoom, this.cameraDistance));

            this.updateCameraPosition();
        });

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Touch events for mobile camera control
        canvas.addEventListener('touchstart', (e) => {
            if (!this.cameraControlEnabled || e.touches.length === 0) return;
            
            if (e.touches.length === 1) {
                // Single touch - rotate camera
                this.isDragging = true;
                this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                // Two finger touch - zoom
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this.lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (!this.cameraControlEnabled) return;
            
            if (e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - this.dragStart.x;
                const deltaY = e.touches[0].clientY - this.dragStart.y;

                // Rotate camera around target
                this.cameraRotation.y += deltaX * 0.005;
                this.cameraRotation.x -= deltaY * 0.005;

                // Clamp vertical rotation
                this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));

                this.updateCameraPosition();
                this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                // Two finger zoom gesture
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentPinchDistance = Math.sqrt(dx * dx + dy * dy);
                
                if (this.lastPinchDistance) {
                    const pinchDelta = this.lastPinchDistance - currentPinchDistance;
                    const maxZoom = this.getMaxZoomDistance();
                    const groundSizeScale = Math.max(this.groundWidth, this.groundHeight) / 200;
                    const effectiveSensitivity = this.zoomSensitivity * groundSizeScale;
                    const zoomSpeed = 5 * effectiveSensitivity;
                    
                    this.cameraDistance += pinchDelta * 0.25 * zoomSpeed;
                    this.cameraDistance = Math.max(10, Math.min(maxZoom, this.cameraDistance));
                    
                    this.updateCameraPosition();
                }
                this.lastPinchDistance = currentPinchDistance;
            }
        });

        canvas.addEventListener('touchend', (e) => {
            this.isDragging = false;
            this.lastPinchDistance = null;
        });
    }

    disableCameraControl() {
        this.cameraControlEnabled = false;
        this.isDragging = false;
        this.isRightDragging = false;
    }

    enableCameraControl() {
        this.cameraControlEnabled = true;
    }

    addMesh(mesh) {
        this.scene.add(mesh);
    }

    removeMesh(mesh) {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
            } else {
                mesh.material.dispose();
            }
        }
    }

    /**
     * Create a standard physics object mesh
     * @param {string} type - Object type
     * @param {number} size - Size parameter
     * @param {THREE.Color} color - Color
     * @returns {THREE.Mesh}
     */
    createObjectMesh(type, size, color) {
        let geometry;
        let material = new THREE.MeshStandardMaterial({
            color,
            metalness: 0.5,
            roughness: 0.4,
            side: THREE.FrontSide,
            transparent: true,
            opacity: 1
        });

        switch (type) {
            case 'sphere':
                geometry = new THREE.SphereGeometry(size, 32, 32);
                break;
            case 'box':
                geometry = new THREE.BoxGeometry(size, size * 0.7, size);
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(size / 2, size / 2, size * 2, 16);
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(size / 2, size * 2, 16);
                break;
            case 'pyramid':
                geometry = new THREE.ConeGeometry(size / 2, size, 4);
                break;
            case 'capsule':
                // Create a capsule-like shape with a sphere on top and cylinder below
                const capsuleGroup = new THREE.Group();
                const capsuleBody = new THREE.CylinderGeometry(size / 2, size / 2, size * 2, 8);
                const capsuleTop = new THREE.SphereGeometry(size / 2, 8, 8);
                const capsuleBodyMesh = new THREE.Mesh(capsuleBody, material);
                const capsuleTopMesh = new THREE.Mesh(capsuleTop, material);
                capsuleTopMesh.position.y = size;
                const capsuleBotMesh = new THREE.Mesh(capsuleTop, material);
                capsuleBotMesh.position.y = -size;
                capsuleGroup.add(capsuleBodyMesh, capsuleTopMesh, capsuleBotMesh);
                const capsuleMesh = new THREE.Mesh(new THREE.CylinderGeometry(size / 2, size / 2, size * 2.5, 8), material);
                capsuleMesh.castShadow = true;
                capsuleMesh.receiveShadow = true;
                return capsuleMesh;
            case 'torus':
                geometry = new THREE.TorusGeometry(size, size * 0.25, 8, 16);
                break;
            case 'icosahedron':
                geometry = new THREE.IcosahedronGeometry(size, 3);
                break;
            case 'nuke':
                // Nuke is a sphere with special material
                geometry = new THREE.SphereGeometry(size, 16, 16);
                material = new THREE.MeshStandardMaterial({
                    color: 0xff9900,
                    metalness: 0.8,
                    roughness: 0.2,
                    emissive: 0xff6600,
                    transparent: true,
                    opacity: 1
                });
                break;
            case 'wall':
                // Wall mesh - vertical plane
                geometry = new THREE.BoxGeometry(1, size, 200);
                material = new THREE.MeshStandardMaterial({
                    color: 0x4a5a7a,
                    metalness: 0.3,
                    roughness: 0.6,
                    side: THREE.DoubleSide
                });
                break;
            case 'left-wall':
            case 'right-wall':
                // Side walls - vertical planes with standard height
                geometry = new THREE.BoxGeometry(1, size, 200);
                material = new THREE.MeshStandardMaterial({
                    color: 0x4a6a8a,
                    metalness: 0.3,
                    roughness: 0.6,
                    side: THREE.DoubleSide
                });
                break;
            case 'front-wall':
            case 'back-wall':
                // Front/back walls - vertical planes oriented differently
                geometry = new THREE.BoxGeometry(200, size, 1);
                material = new THREE.MeshStandardMaterial({
                    color: 0x4a5a7a,
                    metalness: 0.3,
                    roughness: 0.6,
                    side: THREE.DoubleSide
                });
                break;
            case 'ceiling':
                // Ceiling mesh - horizontal plane
                geometry = new THREE.BoxGeometry(200, 1, 200);
                material = new THREE.MeshStandardMaterial({
                    color: 0x2d3d5a,
                    metalness: 0.2,
                    roughness: 0.7,
                    side: THREE.DoubleSide
                });
                break;
            default:
                geometry = new THREE.SphereGeometry(size, 32, 32);
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = true;

        return mesh;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Add explosion effect visual
     * @param {THREE.Vector3} position - Position of explosion
     * @param {number} radius - Explosion radius
     */
    showExplosionEffect(position, radius) {
        // Create explosion sphere visualization
        const geometry = new THREE.SphereGeometry(radius / 2, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff6b35,
            transparent: true,
            opacity: 0.4
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);

        this.scene.add(mesh);

        // Fade out and remove
        let elapsed = 0;
        const duration = 0.3;

        const updateEffect = () => {
            elapsed += 0.016;
            material.opacity = 0.4 * (1 - elapsed / duration);

            if (elapsed >= duration) {
                this.removeMesh(mesh);
            } else {
                requestAnimationFrame(updateEffect);
            }
        };

        updateEffect();
    }

    /**
     * Get the Cannon.Vec3 position from screen coordinates (raycasting)
     * Useful for object placement or interaction
     * @param {number} x - Screen X coordinate
     * @param {number} y - Screen Y coordinate
     * @returns {THREE.Vector3} World position
     */
    getWorldPositionFromMouse(x, y) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        mouse.x = (x / window.innerWidth) * 2 - 1;
        mouse.y = -(y / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, this.camera);

        // Intersect with ground plane
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, intersection);

        return intersection;
    }

    /**
     * Clear all objects from the scene except non-mesh elements
     */
    clearObjectMeshes() {
        const objectsToRemove = [];
        this.scene.traverse((obj) => {
            if (obj instanceof THREE.Mesh && obj !== this.groundMesh && obj !== this.directionalLight) {
                objectsToRemove.push(obj);
            }
        });

        objectsToRemove.forEach(obj => this.removeMesh(obj));
    }
}

window.ThreeRenderer = ThreeRenderer;

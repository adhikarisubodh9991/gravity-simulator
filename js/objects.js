// Manages all the physics objects in the scene
// Creates bodies, handles collisions, voiding, explosions, etc

class ObjectManager {
    constructor(physicsWorld, renderer) {
        this.physics = physicsWorld;
        this.renderer = renderer;

        this.objects = new Map(); 
        this.objectIndex = 0;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.soundEnabled = true;

        this.destructionMode = false;

        // things that fall off the map should actually drop into the void
        this.voidThreshold = -300;
        this.fadingObjects = new Map();

        // Audio throttling - prevent collision sound spam causing glitching
        this.lastCollisionSoundTime = 0;
        this.collisionSoundCooldown = 50; // ms between collision sounds

        // Physics event listeners for collisions
        this.setupCollisionListeners();
        this.setupDestructionMode();
    }

    setupCollisionListeners() {
        this.physics.world.addEventListener('collide', (e) => {
            if (this.soundEnabled && e.body && e.contact) {
                const impact = Math.abs(e.contact.getImpactVelocityAlongNormal());
                if (impact > 10) {
                    this.playCollisionSound(Math.min(impact / 50, 1));
                }
            }
        });
    }

    setupDestructionMode() {
        document.getElementById('canvas').addEventListener('click', (e) => {
            if (!this.destructionMode) return;

            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            const canvas = document.getElementById('canvas');

            mouse.x = (e.clientX / canvas.clientWidth) * 2 - 1;
            mouse.y = -(e.clientY / canvas.clientHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, this.renderer.camera);

            const meshes = Array.from(this.objects.values()).map(obj => obj.mesh);
            const intersects = raycaster.intersectObjects(meshes);

            if (intersects.length > 0) {
                const clickedMesh = intersects[0].object;
                // find and delete it
                for (let [bodyId, obj] of this.objects) {
                    if (obj.mesh === clickedMesh) {
                        this.removeObject(bodyId);
                        this.playDestructionSound();
                        break;
                    }
                }
            }
        });
    }

    createObject(type = 'sphere', position = null, customMass = null, sizeMultiplier = 1) {
        const shouldRandomizeVelocity = !position;
        const hasExplicitSpawnPoint = !!position;
        
        // Default random position if not specified
        if (!position) {
            position = new CANNON.Vec3(
                (Math.random() - 0.5) * 40,
                Math.random() * 30 + 35,
                (Math.random() - 0.5) * 40
            );
        }

        let physicsBody, size, color = this.getRandomColor(), mass = customMass || 5;

        switch (type) {
            case 'sphere':
                size = 2 * sizeMultiplier;
                mass = customMass || 5;
                physicsBody = this.physics.createSphereBody(position, size, mass, shouldRandomizeVelocity);
                break;

            case 'box':
                size = 2 * sizeMultiplier;
                mass = customMass || 10;
                const halfExtents = new CANNON.Vec3(size / 2, size / 2, size / 2);
                physicsBody = this.physics.createBoxBody(position, halfExtents, mass, shouldRandomizeVelocity);
                break;

            case 'cylinder':
                size = 2 * sizeMultiplier;
                mass = customMass || 8;
                physicsBody = this.physics.createCylinderBody(position, size / 2, size * 2, mass, shouldRandomizeVelocity);
                break;

            case 'cone':
                size = 2 * sizeMultiplier;
                mass = customMass || 6;
                physicsBody = this.physics.createConeBody(position, size / 2, size * 2, mass, shouldRandomizeVelocity);
                break;

            case 'pyramid':
                size = 2 * sizeMultiplier;
                mass = customMass || 8;
                physicsBody = this.physics.createPyramidBody(position, size, mass, shouldRandomizeVelocity);
                break;

            case 'capsule':
                size = 2 * sizeMultiplier;
                mass = customMass || 7;
                physicsBody = this.physics.createCapsuleBody(position, size / 2, size * 2.5, mass, shouldRandomizeVelocity);
                break;

            case 'torus':
                size = 2 * sizeMultiplier;
                mass = customMass || 5;
                physicsBody = this.physics.createTorusBody(position, size, size * 0.25, mass, shouldRandomizeVelocity);
                break;

            case 'icosahedron':
                size = 2 * sizeMultiplier;
                mass = customMass || 6;
                physicsBody = this.physics.createIcosahedronBody(position, size, mass, shouldRandomizeVelocity);
                break;

            case 'wall':
                size = 50 * sizeMultiplier; // Height of wall
                mass = 0; // Static
                physicsBody = this.physics.createWallBody(position, size);
                break;

            case 'left-wall':
                size = 50 * sizeMultiplier;
                mass = 0;
                physicsBody = this.physics.createLeftWallBody(size);
                break;

            case 'right-wall':
                size = 50 * sizeMultiplier;
                mass = 0;
                physicsBody = this.physics.createRightWallBody(size);
                break;

            case 'front-wall':
                size = 50 * sizeMultiplier;
                mass = 0;
                physicsBody = this.physics.createFrontWallBody(size);
                break;

            case 'back-wall':
                size = 50 * sizeMultiplier;
                mass = 0;
                physicsBody = this.physics.createBackWallBody(size);
                break;

            case 'ceiling':
                size = 1; // Thickness
                mass = 0; // Static
                // Position ceiling high up
                const ceilingPos = new CANNON.Vec3(
                    position.x,
                    50,
                    position.z
                );
                physicsBody = this.physics.createCeilingBody(ceilingPos);
                break;

            default:
                size = 2 * sizeMultiplier;
                mass = customMass || 5;
                physicsBody = this.physics.createSphereBody(position, size, mass, shouldRandomizeVelocity);
        }

        if (physicsBody && physicsBody.mass > 0) {
            const shapeDamping = {
                sphere: { linear: 0.09, angular: 0.14 },
                box: { linear: 0.1, angular: 0.18 },
                cylinder: { linear: 0.12, angular: 0.24 },
                cone: { linear: 0.12, angular: 0.24 },
                pyramid: { linear: 0.13, angular: 0.26 },
                capsule: { linear: 0.12, angular: 0.24 },
                torus: { linear: 0.14, angular: 0.3 },
                icosahedron: { linear: 0.11, angular: 0.2 }
            };
            const tuned = shapeDamping[type];
            if (tuned) {
                physicsBody.linearDamping = tuned.linear;
                physicsBody.angularDamping = tuned.angular;
            }

            const irregularityStrength = hasExplicitSpawnPoint
                ? (type === 'torus' ? 0.02 : type === 'sphere' ? 0.05 : 0.12)
                : 0.45;
            this.physics.applySpawnIrregularities(physicsBody, irregularityStrength);
        }

        // Add body to world and create mesh
        const bodyId = this.physics.addBody(physicsBody);
        const mesh = this.renderer.createObjectMesh(type, size, color);
        let meshQuatOffset = null;
        if (type === 'cylinder' || type === 'capsule') {
            meshQuatOffset = new THREE.Quaternion();
            meshQuatOffset.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
        }
        mesh.position.copy(physicsBody.position);
        mesh.quaternion.copy(physicsBody.quaternion);
        if (meshQuatOffset) {
            mesh.quaternion.multiply(meshQuatOffset);
        }
        this.renderer.addMesh(mesh);

        this.objects.set(bodyId, { mesh, bodyId, type, color, physicsBody, mass, meshQuatOffset });

        // Sound on impact
        physicsBody.addEventListener('collide', (e) => {
            if (this.soundEnabled) {
                const v = physicsBody.velocity.length();
                if (v > 15) this.playCollisionSound(Math.min(v / 100, 1));
            }
        });

        return bodyId;
    }

    updateMeshes() {
        for (let [, obj] of this.objects) {
            if (obj.physicsBody && obj.mesh) {
                obj.mesh.position.copy(obj.physicsBody.position);
                obj.mesh.quaternion.copy(obj.physicsBody.quaternion);
                if (obj.meshQuatOffset) {
                    obj.mesh.quaternion.multiply(obj.meshQuatOffset);
                }
            }
        }

        this.checkVoid();
    }

    checkVoid() {
        const gw = this.renderer.groundWidth || 200;
        const gh = this.renderer.groundHeight || 200;
        const bx = gw / 2, bz = gh / 2;
        const toRemove = [];

        for (let [id, obj] of this.objects) {
            if (!obj.physicsBody || !obj.mesh) continue;
            
            const p = obj.physicsBody.position;
            const outsideX = Math.abs(p.x) > bx;
            const outsideZ = Math.abs(p.z) > bz;
            const escapedArena = outsideX || outsideZ;
            const belowVoid = p.y < this.voidThreshold;
            const outside = escapedArena || belowVoid;
            
            if (outside) {
                // Start fading
                if (!this.fadingObjects.has(id)) {
                    const startOp = Array.isArray(obj.mesh.material)
                        ? (obj.mesh.material[0]?.opacity || 1)
                        : (obj.mesh.material?.opacity || 1);
                    this.fadingObjects.set(id, { startTime: Date.now(), duration: 1700, startOpacity: startOp });

                    // Once object leaves arena bounds, disable collisions so it truly falls into void.
                    if (escapedArena) {
                        obj.physicsBody.collisionResponse = false;
                        obj.physicsBody.collisionFilterMask = 0;
                        obj.physicsBody.velocity.y = Math.min(obj.physicsBody.velocity.y, -20);
                    }
                }
                
                const info = this.fadingObjects.get(id);
                const elapsed = Date.now() - info.startTime;
                const progress = Math.min(elapsed / info.duration, 1);

                if (escapedArena) {
                    obj.physicsBody.velocity.y = Math.min(obj.physicsBody.velocity.y, -28 - progress * 52);
                    obj.physicsBody.angularVelocity.x += 0.03;
                    obj.physicsBody.angularVelocity.z += 0.02;
                }
                
                if (obj.mesh.material) {
                    if (Array.isArray(obj.mesh.material)) {
                        obj.mesh.material.forEach(m => { m.opacity = info.startOpacity * (1 - progress); m.transparent = true; });
                    } else {
                        obj.mesh.material.opacity = info.startOpacity * (1 - progress);
                        obj.mesh.material.transparent = true;
                    }
                }

                const scale = 1 - progress * 0.24;
                obj.mesh.scale.setScalar(Math.max(0.55, scale));
                
                if (progress >= 1) toRemove.push(id);
            } else {
                // Restore if was fading
                if (this.fadingObjects.has(id)) {
                    const info = this.fadingObjects.get(id);
                    if (obj.mesh.material) {
                        if (Array.isArray(obj.mesh.material)) {
                            obj.mesh.material.forEach(m => { m.opacity = info.startOpacity; });
                        } else {
                            obj.mesh.material.opacity = info.startOpacity;
                        }
                    }
                    obj.physicsBody.collisionResponse = true;
                    obj.physicsBody.collisionFilterMask = -1;
                    obj.mesh.scale.set(1, 1, 1);
                    this.fadingObjects.delete(id);
                }
            }
        }
        
        toRemove.forEach(id => {
            const obj = this.objects.get(id);
            if (obj) { this.removeObject(id); this.fadingObjects.delete(id); }
        });
    }

    removeObject(bodyId) {
        const obj = this.objects.get(bodyId);
        if (obj) {
            this.physics.removeBody(bodyId);
            this.renderer.removeMesh(obj.mesh);
            this.objects.delete(bodyId);
        }
    }

    clearAll() {
        const bodyIds = Array.from(this.objects.keys());
        bodyIds.forEach(id => this.removeObject(id));
    }

    getObjectCount() {
        return this.objects.size;
    }

    triggerExplosion() {
        const center = new CANNON.Vec3(0, 35, 0);
        const radius = 50;
        const force = 350;

        this.physics.explosion(center, radius, force);

        this.renderer.showExplosionEffect(new THREE.Vector3(center.x, center.y, center.z), radius);

        if (this.soundEnabled) {
            this.playExplosionSound();
        }
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
    }

    toggleDestructionMode() {
        this.destructionMode = !this.destructionMode;
    }

    setVoidThreshold(threshold) {
        this.voidThreshold = threshold;
    }

    dropNuke(power = 500) {
        const position = new CANNON.Vec3(
            (Math.random() - 0.5) * 30,
            100,
            (Math.random() - 0.5) * 30
        );

        // Create nuke body
        const nukeBody = new CANNON.Body({
            mass: 20,
            shape: new CANNON.Sphere(2),
            linearDamping: 0.1,
            angularDamping: 0.1
        });

        nukeBody.position.copy(position);
        const bodyId = this.physics.addBody(nukeBody);

        const mesh = this.renderer.createObjectMesh('nuke', 2, new THREE.Color(0xff9900));
        mesh.position.copy(nukeBody.position);
        this.renderer.addMesh(mesh);

        this.objects.set(bodyId, {
            mesh,
            bodyId,
            type: 'nuke',
            color: new THREE.Color(0xff9900),
            physicsBody: nukeBody,
            mass: 20,
            isNuke: true,
            nukePower: power
        });

        // nuke explodes when it hits something hard enough
        nukeBody.addEventListener('collide', (e) => {
            const velocity = nukeBody.velocity.length();
            if (velocity > 20) {
                this.explodeNuke(bodyId, power);
            }
        });

        console.log('Nuke dropped with power:', power);
    }

    explodeNuke(bodyId, power) {
        const obj = this.objects.get(bodyId);
        if (!obj || obj.isNukeExploded) return;

        obj.isNukeExploded = true;

        const center = new CANNON.Vec3(
            obj.physicsBody.position.x,
            obj.physicsBody.position.y,
            obj.physicsBody.position.z
        );

        // bigger explosion for more power
        const radius = 40 + (power / 100);
        const force = 300 + (power / 2);

        this.physics.explosion(center, radius, force);

        this.renderer.showExplosionEffect(
            new THREE.Vector3(center.x, center.y, center.z),
            radius
        );

        if (this.soundEnabled) {
            this.playNukeExplosion(power);
        }

        // clean up nuke after explosion
        setTimeout(() => {
            this.removeObject(bodyId);
        }, 100);
    }

    // --- SOUND EFFECTS ---

    getRandomColor() {
        const hue = Math.random();
        const saturation = 0.6 + Math.random() * 0.3;
        const lightness = 0.4 + Math.random() * 0.2;

        const color = new THREE.Color();
        color.setHSL(hue, saturation, lightness);
        return color;
    }

    playSound(frequency = 400, duration = 0.1, waveform = 'sine') {
        try {
            if (!this.soundEnabled || this.audioContext.state === 'closed') return;

            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.type = waveform;
            osc.frequency.setValueAtTime(frequency, now);

            // volume envelope - fade in and out
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration - 0.05);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            // gracefully fail if audio doesn't work
            console.debug('Audio playback unavailable:', e.message);
        }
    }

    playCollisionSound(impact) {
        // throttle collision sounds to prevent audio glitching
        const now = Date.now();
        if (now - this.lastCollisionSoundTime < this.collisionSoundCooldown) {
            return;
        }
        this.lastCollisionSoundTime = now;
        
        // skip very small collisions
        if (impact < 0.1) return;
        
        const frequency = 200 + impact * 200;
        const duration = 0.08;
        this.playSound(frequency, duration, 'sine');
    }

    playExplosionSound() {
        // simple explosion sound
        this.playSound(200, 0.3, 'sine');
    }

    playNukeExplosion(power) {
        // simple nuke explosion sound
        this.playSound(150, 0.4, 'sine');
    }

    playDestructionSound() {
        // simple destruction sound
        this.playSound(250, 0.15, 'sine');
    }

    saveState() {
        const state = {
            gravity: this.physics.getGravity(),
            objects: []
        };

        for (let [, obj] of this.objects) {
            state.objects.push({
                type: obj.type,
                position: {
                    x: obj.physicsBody.position.x,
                    y: obj.physicsBody.position.y,
                    z: obj.physicsBody.position.z
                },
                velocity: {
                    x: obj.physicsBody.velocity.x,
                    y: obj.physicsBody.velocity.y,
                    z: obj.physicsBody.velocity.z
                },
                rotation: {
                    x: obj.physicsBody.quaternion.x,
                    y: obj.physicsBody.quaternion.y,
                    z: obj.physicsBody.quaternion.z,
                    w: obj.physicsBody.quaternion.w
                }
            });
        }

        return state;
    }

    loadState(state) {
        this.clearAll();

        if (state.objects && Array.isArray(state.objects)) {
            for (let objState of state.objects) {
                const position = new CANNON.Vec3(
                    objState.position.x,
                    objState.position.y,
                    objState.position.z
                );

                const bodyId = this.createObject(objState.type, position);
                const obj = this.objects.get(bodyId);

                if (obj && objState.velocity) {
                    obj.physicsBody.velocity.set(
                        objState.velocity.x,
                        objState.velocity.y,
                        objState.velocity.z
                    );
                }
            }
        }
    }
}

window.ObjectManager = ObjectManager;

// Physics world using cannon.js
// Wraps body creation, gravity, collisions, explosions

class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World();
        // Scene units are larger than real-world meters, so scale gravity for natural feel.
        this.gravityScale = 2.0;
        this.world.gravity.set(0, -20 * this.gravityScale, 0);
        this.world.defaultContactMaterial.friction = 0.28;
        this.world.defaultContactMaterial.restitution = 0.12;
        this.world.defaultContactMaterial.contactEquationRelaxation = 4;
        this.world.defaultContactMaterial.contactEquationStiffness = 1e7;
        this.world.solver.iterations = 14;
        this.world.allowSleep = false;
        this.world.sleepSpeedLimit = 0.1;

        this.setupGround();
        this.bodies = new Map();
        this.bodyIndex = 0;
        this.fixedTimeStep = 1 / 60;
    }

    setupGround() {
        const ground = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Plane()
        });
        ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        ground.position.y = -25;
        this.world.addBody(ground);
        this.groundBody = ground;
    }

    addBody(body) {
        this.world.addBody(body);
        const id = this.bodyIndex++;
        this.bodies.set(id, body);
        return id;
    }

    removeBody(bodyId) {
        const body = this.bodies.get(bodyId);
        if (body) {
            this.world.removeBody(body);
            this.bodies.delete(bodyId);
        }
    }

    getBody(bodyId) {
        return this.bodies.get(bodyId);
    }

    step(deltaTime) {
        const dt = Math.min(Math.max(deltaTime, 0), 0.05);
        this.world.step(this.fixedTimeStep, dt, 5);
    }

    setGravity(strength) {
        const g = Math.max(0, Number(strength) || 0);
        this.world.gravity.y = -(g * this.gravityScale);
    }

    getGravity() {
        return (-this.world.gravity.y) / this.gravityScale;
    }

    setFriction(friction) {
        const f = Math.max(0, Math.min(1, friction));
        this.world.defaultContactMaterial.friction = f;
        for (let material of this.world.materials) {
            for (let cm of this.world.contactMaterials) {
                if (cm.materials[0] === material || cm.materials[1] === material) cm.friction = f;
            }
        }
    }

    setRestitution(restitution) {
        const r = Math.max(0, Math.min(1, restitution));
        this.world.defaultContactMaterial.restitution = r;
        for (let material of this.world.materials) {
            for (let cm of this.world.contactMaterials) {
                if (cm.materials[0] === material || cm.materials[1] === material) cm.restitution = r;
            }
        }
    }

    getBodyCount() {
        return this.bodies.size;
    }

    createSphereBody(position, radius = 2, mass = 10, randomize = true) {
        const body = new CANNON.Body({
            mass,
            shape: new CANNON.Sphere(radius),
            linearDamping: 0.02,
            angularDamping: 0.02
        });
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createBoxBody(position, halfExtents, mass = 10, randomize = true) {
        const body = new CANNON.Body({
            mass,
            shape: new CANNON.Box(halfExtents),
            linearDamping: 0.02,
            angularDamping: 0.02
        });
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createCylinderBody(position, radius = 2, height = 5, mass = 8, randomize = true) {
        // Note: Cannon supports spheres natively, cylinders are approximated
        const body = new CANNON.Body({ mass, shape: new CANNON.Sphere(radius), linearDamping: 0.02, angularDamping: 0.02 });
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createConeBody(position, radius = 2, height = 5, mass = 6, randomize = true) {
        // Cone is also approximated as a sphere
        const body = new CANNON.Body({ mass, shape: new CANNON.Sphere(radius * 0.8), linearDamping: 0.02, angularDamping: 0.02 });
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createPyramidBody(position, size = 3, mass = 8, randomize = true) {
        // Use a box to approximate pyramid shape
        const extents = new CANNON.Vec3(size / 2, size, size / 2);
        const body = new CANNON.Body({ mass, shape: new CANNON.Box(extents), linearDamping: 0.02, angularDamping: 0.02 });
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createCapsuleBody(position, radius = 1.5, length = 4, mass = 7, randomize = true) {
        // Simplified as sphere
        const body = new CANNON.Body({ mass, shape: new CANNON.Sphere(radius), linearDamping: 0.02, angularDamping: 0.02 });
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createTorusBody(position, radius = 3, tubeRadius = 0.8, mass = 5, randomize = true) {
        // Torus as sphere approximation
        const body = new CANNON.Body({ mass, shape: new CANNON.Sphere(radius * 0.7), linearDamping: 0.02, angularDamping: 0.02 });
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createIcosahedronBody(position, size = 2, mass = 8, randomize = true) {
        // Icosa is complex, use sphere
        const body = new CANNON.Body({ mass, shape: new CANNON.Sphere(size), linearDamping: 0.02, angularDamping: 0.02 });
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    explosion(center, radius, force) {
        for (let [, body] of this.bodies) {
            if (body.mass === 0) continue;

            const diff = new CANNON.Vec3(
                body.position.x - center.x,
                body.position.y - center.y,
                body.position.z - center.z
            );
            const dist = diff.length();

            if (dist < radius && dist > 0.1) {
                // Squared falloff makes it realistic
                const falloff = (1 - dist / radius);
                const impulse = falloff * falloff * force;
                const direction = diff.unit().scale(impulse);

                body.velocity.x += direction.x / body.mass;
                body.velocity.y += direction.y / body.mass;
                body.velocity.z += direction.z / body.mass;

                // Spin it
                const spin = falloff * 30;
                body.angularVelocity.x += (Math.random() - 0.5) * spin;
                body.angularVelocity.y += (Math.random() - 0.5) * spin;
                body.angularVelocity.z += (Math.random() - 0.5) * spin;
            }
        }
    }

    createWallBody(position, height = 50, thickness = 1) {
        const box = new CANNON.Vec3(100, height / 2, thickness);
        const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(box) });
        body.position.copy(position);
        return body;
    }

    createLeftWallBody(height = 50) {
        return this.createWallBody(new CANNON.Vec3(-100, height / 2, 0), height, 1);
    }

    createRightWallBody(height = 50) {
        return this.createWallBody(new CANNON.Vec3(100, height / 2, 0), height, 1);
    }

    createFrontWallBody(height = 50) {
        const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(100, height / 2, 1)) });
        body.position.set(0, height / 2, -100);
        return body;
    }

    createBackWallBody(height = 50) {
        const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(100, height / 2, 1)) });
        body.position.set(0, height / 2, 100);
        return body;
    }

    createCeilingBody(position, width = 200, depth = 200) {
        const box = new CANNON.Vec3(width / 2, 1, depth / 2);
        const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(box) });
        body.position.copy(position);
        return body;
    }

    randomizeVelocity(body) {
        body.velocity.set(
            (Math.random() - 0.5) * 4,
            Math.random() * 1.5,
            (Math.random() - 0.5) * 4
        );
    }

    applySpawnIrregularities(body, strength = 1) {
        const s = Math.max(0, strength);
        body.angularVelocity.x += (Math.random() - 0.5) * 6 * s;
        body.angularVelocity.y += (Math.random() - 0.5) * 4 * s;
        body.angularVelocity.z += (Math.random() - 0.5) * 6 * s;

        const tilt = 0.18 * s;
        const q = new CANNON.Quaternion();
        q.setFromEuler(
            (Math.random() - 0.5) * tilt,
            (Math.random() - 0.5) * Math.PI,
            (Math.random() - 0.5) * tilt,
            'XYZ'
        );
        body.quaternion = body.quaternion.mult(q);
    }

    reset() {
        const positions = [];
        for (let [, body] of this.bodies) {
            positions.push({
                body: body,
                position: body.position.clone(),
                velocity: body.velocity.clone(),
                angularVelocity: body.angularVelocity.clone()
            });
        }
        this.initialPositions = positions;
    }

    clearAllBodies() {
        for (let [, body] of this.bodies) {
            this.world.removeBody(body);
        }
        this.bodies.clear();
        this.bodyIndex = 0;
    }
}

window.PhysicsWorld = PhysicsWorld;

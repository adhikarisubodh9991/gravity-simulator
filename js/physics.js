// Physics world using cannon.js
// Wraps body creation, gravity, collisions, explosions

class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World();
        // Scene units are larger than real-world meters, so scale gravity for natural feel.
        this.gravityScale = 2.0;
        this.world.gravity.set(0, -20 * this.gravityScale, 0);
        this.world.defaultContactMaterial.friction = 0.55;
        this.world.defaultContactMaterial.restitution = 0.08;
        this.world.defaultContactMaterial.contactEquationRelaxation = 4;
        this.world.defaultContactMaterial.contactEquationStiffness = 3e7;
        this.world.solver.iterations = 20;
        this.world.allowSleep = false;
        this.world.sleepSpeedLimit = 0.1;
        this.defaultLinearDamping = 0.08;
        this.defaultAngularDamping = 0.12;
        this.idleLinearThreshold = 0.2;
        this.idleAngularThreshold = 0.22;
        this.maxSubSteps = 8;
        this.groundPenetrationSlop = 0.015;

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
        this.world.step(this.fixedTimeStep, dt, this.maxSubSteps);

        const groundY = this.groundBody ? this.groundBody.position.y : -25;

        // Apply gentle settling on low-speed bodies so they stop gliding forever.
        for (let [, body] of this.bodies) {
            if (!body || body.mass <= 0) continue;

            // Ignore out-of-bounds bodies that intentionally have collisions disabled.
            if (body.collisionResponse === false || body.collisionFilterMask === 0) continue;

            // Heavy bodies can tunnel in a single step; project them back above the plane.
            body.computeAABB();
            if (body.aabb && body.aabb.lowerBound.y < (groundY - this.groundPenetrationSlop)) {
                const correction = (groundY - body.aabb.lowerBound.y) + this.groundPenetrationSlop;
                body.position.y += correction;
                if (body.velocity.y < 0) body.velocity.y = 0;
            }

            if (body.position.y > -22.5) continue;

            const v = body.velocity.length();
            const av = body.angularVelocity.length();
            if (v < this.idleLinearThreshold && av < this.idleAngularThreshold) {
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);
            }
        }
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
            linearDamping: this.defaultLinearDamping,
            angularDamping: this.defaultAngularDamping
        });
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createBoxBody(position, halfExtents, mass = 10, randomize = true) {
        const body = new CANNON.Body({
            mass,
            shape: new CANNON.Box(halfExtents),
            linearDamping: this.defaultLinearDamping,
            angularDamping: this.defaultAngularDamping
        });
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createCylinderBody(position, radius = 2, height = 5, mass = 8, randomize = true) {
        const coreLength = Math.max(0.6, height - radius * 0.9);
        const cylinder = new CANNON.Cylinder(radius, radius, coreLength, 16);
        const body = new CANNON.Body({ mass, linearDamping: this.defaultLinearDamping, angularDamping: this.defaultAngularDamping });
        body.addShape(cylinder);
        // Rounded endcaps make vertical standing unstable and encourage realistic rolling.
        body.addShape(new CANNON.Sphere(radius), new CANNON.Vec3(coreLength / 2, 0, 0));
        body.addShape(new CANNON.Sphere(radius), new CANNON.Vec3(-coreLength / 2, 0, 0));
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createConeBody(position, radius = 2, height = 5, mass = 6, randomize = true) {
        const cone = new CANNON.Cylinder(Math.max(0.06, radius * 0.08), radius, height, 16);
        const body = new CANNON.Body({ mass, linearDamping: this.defaultLinearDamping, angularDamping: this.defaultAngularDamping });
        const alignY = new CANNON.Quaternion();
        alignY.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
        body.addShape(cone, new CANNON.Vec3(0, 0, 0), alignY);
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createPyramidBody(position, size = 3, mass = 8, randomize = true) {
        const radius = size / 2;
        const height = size;
        const pyramid = new CANNON.Cylinder(Math.max(0.04, radius * 0.08), radius, height, 4);
        const body = new CANNON.Body({ mass, linearDamping: this.defaultLinearDamping, angularDamping: this.defaultAngularDamping });
        const alignY = new CANNON.Quaternion();
        alignY.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
        body.addShape(pyramid, new CANNON.Vec3(0, 0, 0), alignY);
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createCapsuleBody(position, radius = 1.5, length = 4, mass = 7, randomize = true) {
        const body = new CANNON.Body({ mass, linearDamping: this.defaultLinearDamping, angularDamping: this.defaultAngularDamping });
        const coreLength = Math.max(0.2, length - radius * 2);
        const cylinder = new CANNON.Cylinder(radius, radius, coreLength, 14);
        body.addShape(cylinder, new CANNON.Vec3(0, 0, 0));
        body.addShape(new CANNON.Sphere(radius), new CANNON.Vec3(coreLength / 2, 0, 0));
        body.addShape(new CANNON.Sphere(radius), new CANNON.Vec3(-coreLength / 2, 0, 0));
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createTorusBody(position, radius = 3, tubeRadius = 0.8, mass = 5, randomize = true) {
        // Build torus as a ring of spheres so it rolls instead of balancing upright.
        const body = new CANNON.Body({ mass, linearDamping: 0.12, angularDamping: 0.34 });
        const segments = 14;
        const nodeRadius = Math.max(0.22, tubeRadius * 0.92);
        for (let i = 0; i < segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            const x = Math.cos(a) * radius;
            const z = Math.sin(a) * radius;
            body.addShape(new CANNON.Sphere(nodeRadius), new CANNON.Vec3(x, 0, z));
        }
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    createIcosahedronBody(position, size = 2, mass = 8, randomize = true) {
        // Icosa is complex, use sphere
        const body = new CANNON.Body({ mass, shape: new CANNON.Sphere(size), linearDamping: this.defaultLinearDamping, angularDamping: this.defaultAngularDamping });
        body.position.copy(position);
        if (randomize) this.randomizeVelocity(body);
        return body;
    }

    setAirResistance(linear, angular) {
        this.defaultLinearDamping = Math.max(0, Math.min(1, Number(linear) || 0));
        this.defaultAngularDamping = Math.max(0, Math.min(1, Number(angular) || 0));

        for (let [, body] of this.bodies) {
            if (!body || body.mass <= 0) continue;
            body.linearDamping = this.defaultLinearDamping;
            body.angularDamping = this.defaultAngularDamping;
        }
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

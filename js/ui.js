// UI controls and status updates
// Handles button state, stat display, notifications

class UIController {
    constructor(physics, objectManager, renderer) {
        this.physics = physics;
        this.objects = objectManager;
        this.renderer = renderer;

        this.els = {
            play: document.getElementById('btn-play-pause'),
            slowMo: document.getElementById('btn-slow-motion'),
            clear: document.getElementById('btn-clear-all'),
            objCount: document.getElementById('stat-object-count'),
            fps: document.getElementById('stat-fps'),
            bodies: document.getElementById('stat-bodies'),
            physTime: document.getElementById('stat-physics-time'),
            sound: document.getElementById('toggle-sound')
        };

        this.initializeUI();
    }

    initializeUI() {
        if (this.els.sound) {
            this.els.sound.addEventListener('change', (e) => {
                this.objects.setSoundEnabled(e.target.checked);
            });
        }
        this.updatePlayPauseButton(true);
        this.updateSlowMoButton(false);
    }

    updatePlayPauseButton(isRunning) {
        if (isRunning) {
            this.els.play.textContent = 'Pause';
            this.els.play.style.opacity = '1';
        } else {
            this.els.play.textContent = 'Play';
            this.els.play.style.opacity = '0.7';
        }
    }

    updateSlowMoButton(isSlowMo) {
        if (isSlowMo) {
            this.els.slowMo.textContent = 'Normal Speed';
            this.els.slowMo.style.opacity = '1';
        } else {
            this.els.slowMo.textContent = 'Slow Motion';
            this.els.slowMo.style.opacity = '0.7';
        }
    }

    updateDestructionModeButton(enabled) {
        const btn = document.getElementById('btn-toggle-destroy');
        if (enabled) {
            btn.textContent = 'Destroy Mode (ON)';
            btn.style.background = '#ff3366';
            btn.style.borderColor = '#ff3366';
        } else {
            btn.textContent = 'Destruction Mode';
            btn.style.background = 'transparent';
            btn.style.borderColor = '#00d4ff';
        }
    }

    updateStats(fps, count, bodies) {
        this.els.objCount.textContent = count;
        this.els.fps.textContent = fps;
        this.els.bodies.textContent = bodies;
        this.els.physTime.textContent = (16.67).toFixed(2);
    }

    notify(message, duration = 2000) {
        const note = document.createElement('div');
        note.textContent = message;
        note.style.cssText = `position: fixed; bottom: 20px; right: 20px; background: #ff6b35; color: white;
            padding: 12px 20px; border-radius: 6px; font-size: 0.9rem; z-index: 200; animation: slideIn 0.3s ease-out;`;
        document.body.appendChild(note);
        setTimeout(() => {
            note.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => note.remove(), 300);
        }, duration);
    }

    disableControls() {
        this.elements.btnPlayPause.disabled = true;
        this.elements.btnSlowMo.disabled = true;
        this.elements.btnExplosion.disabled = true;
        this.elements.btnClearAll.disabled = true;
        this.elements.sliderGravity.disabled = true;
        this.elements.sliderFriction.disabled = true;
        this.elements.sliderRestitution.disabled = true;
    }

    enableControls() {
        this.elements.btnPlayPause.disabled = false;
        this.elements.btnSlowMo.disabled = false;
        this.elements.btnExplosion.disabled = false;
        this.elements.btnClearAll.disabled = false;
        this.elements.sliderGravity.disabled = false;
        this.elements.sliderFriction.disabled = false;
        this.elements.sliderRestitution.disabled = false;
    }

    reset() {
        this.elements.sliderGravity.value = 20;
        this.elements.sliderFriction.value = 0.45;
        this.elements.sliderRestitution.value = 0.08;
        this.elements.toggleSound.checked = true;

        this.elements.displayGravity.textContent = '20';
        this.elements.displayFriction.textContent = '0.45';
        this.elements.displayRestitution.textContent = '0.08';

        this.updatePlayPauseButton(true);
        this.updateSlowMoButton(false);

        this.physics.setGravity(20);
        this.physics.setFriction(0.45);
        this.physics.setRestitution(0.08);
    }
}

window.UIController = UIController;

// Add CSS animations to document
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

import Phaser from 'phaser';

// Global event emitter for cross-scene/cross-object communication
const eventsCenter = new Phaser.Events.EventEmitter();

export default eventsCenter;

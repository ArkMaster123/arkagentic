import { Physics } from 'phaser';

export class Actor extends Physics.Arcade.Sprite {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.getBody().setCollideWorldBounds(true);
  }

  protected getBody(): Physics.Arcade.Body {
    return this.body as Physics.Arcade.Body;
  }

  initAnimations(): void {
    // Sprite sheet layout (12 frames in horizontal strip):
    // Frames 0-2: DOWN (front facing)
    // Frames 3-5: UP (back facing)
    // Frames 6-8: LEFT (side)
    // Frames 9-11: RIGHT (side)
    
    const anims = this.scene.anims;
    const textureKey = this.texture.key;
    
    // Walk down - character faces down/toward camera (frames 0-2)
    const walkDownKey = this.name + '-walk-down';
    if (!anims.exists(walkDownKey)) {
      anims.create({
        key: walkDownKey,
        frames: anims.generateFrameNumbers(textureKey, { start: 0, end: 2 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    // Walk up - character faces up/away from camera (frames 3-5)
    const walkUpKey = this.name + '-walk-up';
    if (!anims.exists(walkUpKey)) {
      anims.create({
        key: walkUpKey,
        frames: anims.generateFrameNumbers(textureKey, { start: 3, end: 5 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    // Walk left - character faces left (frames 6-8)
    const walkLeftKey = this.name + '-walk-left';
    if (!anims.exists(walkLeftKey)) {
      anims.create({
        key: walkLeftKey,
        frames: anims.generateFrameNumbers(textureKey, { start: 6, end: 8 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    // Walk right - character faces right (frames 9-11)
    const walkRightKey = this.name + '-walk-right';
    if (!anims.exists(walkRightKey)) {
      anims.create({
        key: walkRightKey,
        frames: anims.generateFrameNumbers(textureKey, { start: 9, end: 11 }),
        frameRate: 8,
        repeat: -1,
      });
    }
  }
}

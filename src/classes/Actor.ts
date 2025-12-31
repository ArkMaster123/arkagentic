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
    
    // Walk down - character faces down/toward camera (frames 0-2)
    this.scene.anims.create({
      key: this.name + '-walk-down',
      frames: this.scene.anims.generateFrameNumbers(this.texture.key, {
        start: 0,
        end: 2,
      }),
      frameRate: 8,
      repeat: -1,
    });

    // Walk up - character faces up/away from camera (frames 3-5)
    this.scene.anims.create({
      key: this.name + '-walk-up',
      frames: this.scene.anims.generateFrameNumbers(this.texture.key, {
        start: 3,
        end: 5,
      }),
      frameRate: 8,
      repeat: -1,
    });

    // Walk left - character faces left (frames 6-8)
    this.scene.anims.create({
      key: this.name + '-walk-left',
      frames: this.scene.anims.generateFrameNumbers(this.texture.key, {
        start: 6,
        end: 8,
      }),
      frameRate: 8,
      repeat: -1,
    });

    // Walk right - character faces right (frames 9-11)
    this.scene.anims.create({
      key: this.name + '-walk-right',
      frames: this.scene.anims.generateFrameNumbers(this.texture.key, {
        start: 9,
        end: 11,
      }),
      frameRate: 8,
      repeat: -1,
    });
  }
}

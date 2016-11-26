import { isString } from 'utils/types';
import { TNSPlayerI } from '../common';
import { AudioPlayerOptions } from '../options';
import * as app from 'application';
import * as utils from 'utils/utils';
import * as fs from 'file-system';
import * as enums from 'ui/enums';

declare var android: any

export class TNSPlayer implements TNSPlayerI {
  private player: any;

  get android(): any {
    return this.player;
  }

  constructor() {
    this.player = new android.media.MediaPlayer();
  }

  public playFromFile(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        let MediaPlayer = android.media.MediaPlayer;
        let audioPath;

        let fileName = isString(options.audioFile) ? options.audioFile.trim() : "";
        if (fileName.indexOf("~/") === 0) {
          fileName = fs.path.join(fs.knownFolders.currentApp().path, fileName.replace("~/", ""));
          audioPath = fileName;
        }
        else {
          audioPath = fileName;
        }

        this.player = new MediaPlayer();

        this.player.setAudioStreamType(android.media.AudioManager.STREAM_MUSIC);
        this.player.setDataSource(audioPath);
        this.player.prepareAsync();

        // On Complete
        if (options.completeCallback) {
          this.player.setOnCompletionListener(new MediaPlayer.OnCompletionListener({
            onCompletion: (mp) => {

              if (options.loop === true) {
                mp.seekTo(5);
                mp.start();
              }

              options.completeCallback();

            }
          }));
        }

        // On Error
        if (options.errorCallback) {
          this.player.setOnErrorListener(new MediaPlayer.OnErrorListener({
            onError: (mp: any, what: number, extra: number) => {
              options.errorCallback();
              return true;
            }
          }));
        }

        // On Info
        if (options.infoCallback) {
          this.player.setOnInfoListener(new MediaPlayer.OnInfoListener({
            onInfo: (mp: any, what: number, extra: number) => {
              options.infoCallback();
              return true;
            }
          }))
        }

        // On Prepared
        this.player.setOnPreparedListener(new MediaPlayer.OnPreparedListener({
          onPrepared: (mp) => {
            mp.start();
            resolve();
          }
        }));

      } catch (ex) {
        reject(ex);
      }
    });
  }

  public playFromUrl(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        let MediaPlayer = android.media.MediaPlayer;

        this.player = new MediaPlayer();

        this.player.setAudioStreamType(android.media.AudioManager.STREAM_MUSIC);
        this.player.setDataSource(options.audioFile);
        this.player.prepareAsync();

        // On Complete
        if (options.completeCallback) {
          this.player.setOnCompletionListener(new MediaPlayer.OnCompletionListener({
            onCompletion: (mp) => {

              if (options.loop === true) {
                mp.seekTo(5);
                mp.start();
              }

              options.completeCallback();

            }
          }));
        }

        // On Error
        if (options.errorCallback) {
          this.player.setOnErrorListener(new MediaPlayer.OnErrorListener({
            onError: (mp: any, what: number, extra: number) => {
              options.errorCallback();
              return true;
            }
          }));
        }

        // On Info
        if (options.infoCallback) {
          this.player.setOnInfoListener(new MediaPlayer.OnInfoListener({
            onInfo: (mp: any, what: number, extra: number) => {
              options.infoCallback();
              return true;
            }
          }))
        }

        // On Prepared
        this.player.setOnPreparedListener(new MediaPlayer.OnPreparedListener({
          onPrepared: (mp) => {
            mp.start();
            resolve();
          }
        }));

      } catch (ex) {
        reject(ex);
      }
    });
  }

  public pause(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this.player.isPlaying()) {
          this.player.pause();
          resolve(true);
        }
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public play(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.player.isPlaying()) {
          this.player.start();
          resolve(true);
        }
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public resume(): void {
    this.player.start();
  }


  public seekTo(time: number): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this.player) {
          this.player.seekTo(time);
          resolve(true);
        }
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public dispose(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        this.player.release();
        resolve();
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public isAudioPlaying(): boolean {
    return this.player.isPlaying();
  }

  public getAudioTrackDuration(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        var duration = this.player.getDuration();
        resolve(duration.toString());
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public get currentTime(): number {
    return this.player ? this.player.getCurrentPosition() : 0;
  }
}
import { isString } from 'utils/types';
import { TNSPlayerI } from '../common';
import { AudioPlayerOptions } from '../options';
import * as app from 'application';
import * as utils from 'utils/utils';
import * as fs from 'file-system';
import * as enums from 'ui/enums';

declare var android: any;
const MediaPlayer = android.media.MediaPlayer;

export class TNSPlayer implements TNSPlayerI {
  private player: android.media.MediaPlayer;

  get android(): any {
    return this.player;
  }

  public initFromFile(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      // init only
      options.autoPlay = false;
      this.playFromFile(options).then(resolve, reject);
    });
  }

  public playFromFile(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      if (options.autoPlay !== false) options.autoPlay = true;

      try {
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

              options.completeCallback({ player: mp });

            }
          }));
        }

        // On Error
        if (options.errorCallback) {
          this.player.setOnErrorListener(new MediaPlayer.OnErrorListener({
            onError: (player: any, error: number, extra: number) => {
              options.errorCallback({ player, error, extra });
              return true;
            }
          }));
        }

        // On Info
        if (options.infoCallback) {
          this.player.setOnInfoListener(new MediaPlayer.OnInfoListener({
            onInfo: (player: any, info: number, extra: number) => {
              options.infoCallback({ player, info, extra });
              return true;
            }
          }))
        }

        // On Prepared
        this.player.setOnPreparedListener(new MediaPlayer.OnPreparedListener({
          onPrepared: (mp) => {
            if (options.autoPlay) mp.start();
            resolve();
          }
        }));

      } catch (ex) {
        reject(ex);
      }
    });
  }

  public initFromUrl(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      options.autoPlay = false;
      this.playFromUrl(options).then(resolve, reject);
    });
  }

  public playFromUrl(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      if (options.autoPlay !== false) options.autoPlay = true;

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

              options.completeCallback({ player: mp });

            }
          }));
        }

        // On Error
        if (options.errorCallback) {
          this.player.setOnErrorListener(new MediaPlayer.OnErrorListener({
            onError: (player: any, error: number, extra: number) => {
              options.errorCallback({ player, error, extra });
              return true;
            }
          }));
        }

        // On Info
        if (options.infoCallback) {
          this.player.setOnInfoListener(new MediaPlayer.OnInfoListener({
            onInfo: (player: any, info: number, extra: number) => {
              options.infoCallback({ player, info, extra });
              return true;
            }
          }))
        }

        // On Prepared
        this.player.setOnPreparedListener(new MediaPlayer.OnPreparedListener({
          onPrepared: (mp) => {
            if (options.autoPlay) mp.start();
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

  public get volume(): number {
    // TODO: find better way to get individual player volume
    let mgr = <android.media.AudioManager>app.android.context.getSystemService(android.content.Context.AUDIO_SERVICE);
    return mgr.getStreamVolume(android.media.AudioManager.STREAM_MUSIC);
  }

  public set volume(value: number) {
    if (this.player) {
      this.player.setVolume(value, value);
    }
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
    return this.player ? this.player.isPlaying() : false;
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

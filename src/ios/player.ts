import * as app from 'application';
import {isString} from 'utils/types';
import {knownFolders, path} from 'file-system';
import {TNSPlayerI} from '../common';
import {AudioPlayerOptions} from '../options';

declare var NSURLSession, AVAudioPlayer, NSURL, AVAudioPlayerDelegate;

export class TNSPlayer extends NSObject implements TNSPlayerI {
  public static ObjCProtocols = [AVAudioPlayerDelegate];
  private _player: any;
  private _task: any;
  private _completeCallback: any;
  private _errorCallback: any;
  private _infoCallback: any;

  public playFromFile(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        let audioPath;

        let fileName = isString(options.audioFile) ? options.audioFile.trim() : "";
        if (fileName.indexOf("~/") === 0) {
          fileName = path.join(knownFolders.currentApp().path, fileName.replace("~/", ""))
        }

        this._completeCallback = options.completeCallback;
        this._errorCallback = options.errorCallback;
        this._infoCallback = options.infoCallback;

        this._player = AVAudioPlayer.alloc().initWithContentsOfURLError(NSURL.fileURLWithPath(fileName));
        this._player.delegate = this;

        if (options.loop) {
          this._player.numberOfLoops = -1;
        }

        this._player.play();

        resolve();

      } catch (ex) {
        if (this._errorCallback) {
          this._errorCallback();
        }
        reject(ex);
      }
    });
  }

  public playFromUrl(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        this._task = NSURLSession.sharedSession().dataTaskWithURLCompletionHandler(NSURL.URLWithString(options.audioFile), (data, response, error) => {
          if (error !== null) {

            if (this._errorCallback) {
              this._errorCallback();
            }

            reject();
          }

          this._completeCallback = options.completeCallback;
          this._errorCallback = options.errorCallback;
          this._infoCallback = options.infoCallback;

          this._player = (<any>AVAudioPlayer.alloc()).initWithDataError(data, null);
          this._player.delegate = this;
          this._player.numberOfLoops = options.loop ? -1 : 0;
          this._player.play();
          resolve();
        });

        this._task.resume();

      } catch (ex) {
        if (this._errorCallback) {
          this._errorCallback();
        }
        reject(ex);
      }
    });
  }

  public pause(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._player && this._player.playing) {
          this._player.pause();
          resolve(true);
        }
      } catch (ex) {
        if (this._errorCallback) {
          this._errorCallback();
        }
        reject(ex);
      }
    });
  }

  public play(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.isAudioPlaying()) {
          this._player.play();
          resolve(true);
        }
      } catch (ex) {
        if (this._errorCallback) {
          this._errorCallback();
        }
        reject(ex);
      }
    });
  }

  public resume(): void {
    this._player.play();
  }

  public seekTo(time: number): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._player) {
          this._player.currentTime = time;
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
        if (this._player && this.isAudioPlaying()) {
          this._player.stop();
        }
        this.reset();
        resolve();
      } catch (ex) {
        if (this._errorCallback) {
          this._errorCallback();
        }
        reject(ex);
      }
    });
  }

  public isAudioPlaying(): boolean {
    return this._player ? this._player.playing : false;
  }

  public getAudioTrackDuration(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        var duration = this._player ? this._player.duration : 0;
        resolve(duration.toString());
      } catch (ex) {
        if (this._errorCallback) {
          this._errorCallback();
        }
        reject(ex);
      }
    });
  }

  public audioPlayerDidFinishPlayingSuccessfully(player?: any, flag?: boolean) {
    if (flag && this._completeCallback) {
      this._completeCallback();
    }
    else if (!flag && this._errorCallback) {
      this._errorCallback();
    }
    this.reset();
  }

  private reset() {
    if (this._player) {
      this._player.release();
      this._player = undefined;
    }
    if (this._task) {
      this._task.cancel();
      this._task = undefined;
    }
  }
}

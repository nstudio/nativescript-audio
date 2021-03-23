import { Application, Observable, Utils } from '@nativescript/core';
import { resolveAudioFilePath, TNSPlayerI } from '../common';
import { AudioPlayerEvents, AudioPlayerOptions } from '../options';

export enum AudioFocusDurationHint {
  AUDIOFOCUS_GAIN = android.media.AudioManager.AUDIOFOCUS_GAIN,
  AUDIOFOCUS_GAIN_TRANSIENT = android.media.AudioManager
    .AUDIOFOCUS_GAIN_TRANSIENT,
  AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK = android.media.AudioManager
    .AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
  AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE = android.media.AudioManager
    .AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
}

export class TNSPlayer implements TNSPlayerI {
  private _mediaPlayer: android.media.MediaPlayer;
  private _audioFocusRequest: android.media.AudioFocusRequest;
  private _mAudioFocusGranted: boolean = false;
  private _lastPlayerVolume; // ref to the last volume setting so we can reset after ducking
  private _events: Observable;
  private _durationHint: AudioFocusDurationHint;
  private _options: AudioPlayerOptions;

  constructor(
    durationHint: AudioFocusDurationHint = AudioFocusDurationHint.AUDIOFOCUS_GAIN
  ) {
    this._durationHint = durationHint;

    // Request audio focus for play back
    if (android.os.Build.VERSION.SDK_INT >= 26) {
      const playbackAttributes = new android.media.AudioAttributes.Builder()
        .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_MUSIC)
        .build();
      this._audioFocusRequest = new android.media.AudioFocusRequest.Builder(
        android.media.AudioManager.AUDIOFOCUS_GAIN
      )
        .setAudioAttributes(playbackAttributes)
        .setAcceptsDelayedFocusGain(true)
        .setOnAudioFocusChangeListener(this._mOnAudioFocusChangeListener)
        .build();
    }
  }

  public get events() {
    if (!this._events) {
      this._events = new Observable();
    }
    return this._events;
  }

  get android(): any {
    return this._player;
  }

  get volume(): number {
    // TODO: find better way to get individual player volume
    const ctx = this._getAndroidContext();
    const mgr = ctx.getSystemService(android.content.Context.AUDIO_SERVICE);
    return mgr.getStreamVolume(android.media.AudioManager.STREAM_MUSIC);
  }

  set volume(value: number) {
    if (this._player && value >= 0) {
      this._player.setVolume(value, value);
    }
  }

  public get duration(): number {
    if (this._player) {
      return this._player.getDuration();
    } else {
      return 0;
    }
  }

  get currentTime(): number {
    return this._player ? this._player.getCurrentPosition() : 0;
  }

  /**
   * Initializes the player with options, will not start playing audio.
   * @param options [AudioPlayerOptions]
   */
  public initFromFile(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      options.autoPlay = false;
      this.playFromFile(options).then(resolve, reject);
    });
  }

  public playFromFile(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        this._options = options;
        if (options.autoPlay !== false) {
          options.autoPlay = true;
        }

        // request audio focus, this will setup the onAudioFocusChangeListener
        if (!options.audioMixing) {
          this._mAudioFocusGranted = this._requestAudioFocus();
        }

        const audioPath = resolveAudioFilePath(options.audioFile);
        this._player.setAudioStreamType(
          android.media.AudioManager.STREAM_MUSIC
        );
        this._player.reset();
        this._player.setDataSource(audioPath);

        // check if local file or remote - local then `prepare` is okay https://developer.android.com/reference/android/media/MediaPlayer.html#prepare()
        if (Utils.isFileOrResourcePath(audioPath)) {
          this._player.prepare();
        } else {
          this._player.prepareAsync();
        }

        // On Info
        if (options.infoCallback) {
          this._player.setOnInfoListener(
            new android.media.MediaPlayer.OnInfoListener({
              onInfo: (player: any, info: number, extra: number) => {
                options.infoCallback({ player, info, extra });
                return true;
              }
            })
          );
        }

        // On Prepared
        this._player.setOnPreparedListener(
          new android.media.MediaPlayer.OnPreparedListener({
            onPrepared: mp => {
              if (options.autoPlay) {
                this.play();
              }
              resolve(null);
            }
          })
        );
      } catch (ex) {
        this._abandonAudioFocus();
        reject(ex);
      }
    });
  }

  /**
   * Initializes the player with options, will not start playing audio.
   * @param options
   */
  public initFromUrl(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      options.autoPlay = false;
      this.playFromUrl(options).then(resolve, reject);
    });
  }

  public playFromUrl(options: AudioPlayerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      resolve(this.playFromFile(options));
    });
  }

  public pause(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._player && this._player.isPlaying()) {
          this._player.pause();
          // We abandon the audio focus but we still preserve
          // the MediaPlayer so we can resume it in the future
          this._abandonAudioFocus(true);
          this._sendEvent(AudioPlayerEvents.paused);
        }

        resolve(true);
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public play(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        console.log('player play()');
        if (this._player && !this._player.isPlaying()) {
          // request audio focus, this will setup the onAudioFocusChangeListener
          this._mAudioFocusGranted = this._requestAudioFocus();
          if (!this._mAudioFocusGranted) {
            throw new Error('Could not request audio focus');
          }

          this._sendEvent(AudioPlayerEvents.started);
          // set volume controls
          // https://developer.android.com/reference/android/app/Activity.html#setVolumeControlStream(int)
          Application.android.foregroundActivity.setVolumeControlStream(
            android.media.AudioManager.STREAM_MUSIC
          );

          // register the receiver so when calls or another app takes main audio focus the player pauses
          Application.android.registerBroadcastReceiver(
            android.media.AudioManager.ACTION_AUDIO_BECOMING_NOISY,
            (
              context: android.content.Context,
              intent: android.content.Intent
            ) => {
              this.pause();
            }
          );

          this._player.start();
        }
        resolve(true);
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public resume(): void {
    if (this._player) {
      // We call play so it can request audio focus
      this.play();
      this._sendEvent(AudioPlayerEvents.started);
    }
  }

  public seekTo(time: number): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._player) {
          time = time * 1000;
          this._player.seekTo(time);
          this._sendEvent(AudioPlayerEvents.seek);
        }
        resolve(true);
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public changePlayerSpeed(speed) {
    // this checks on API 23 and up
    if (android.os.Build.VERSION.SDK_INT >= 23 && this.play) {
      if (this._player?.isPlaying()) {
        (this._player as any).setPlaybackParams(
          (this._player as any).getPlaybackParams().setSpeed(speed)
        );
      } else {
        (this._player as any).setPlaybackParams(
          (this._player as any).getPlaybackParams().setSpeed(speed)
        );
        this._player?.pause();
      }
    } else {
      console.warn(
        'Android device API is not 23+. Cannot set the playbackRate on lower Android APIs.'
      );
    }
  }

  public dispose(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (this._player) {
          this._player.stop();
          this._player.reset();
          // Remove _options since we are back to the Idle state
          // (Refer to: https://developer.android.com/reference/android/media/MediaPlayer#state-diagram)
          this._options = undefined;
          // unregister broadcast receiver
          Application.android.unregisterBroadcastReceiver(
            android.media.AudioManager.ACTION_AUDIO_BECOMING_NOISY
          );

          this._abandonAudioFocus();
        }
        resolve(null);
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public isAudioPlaying(): boolean {
    if (this._player) {
      return this._player.isPlaying();
    } else {
      return false;
    }
  }

  public getAudioTrackDuration(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const duration = this._player ? this._player.getDuration() : 0;
        resolve(duration.toString());
      } catch (ex) {
        reject(ex);
      }
    });
  }

  /**
   * Notify events by name and optionally pass data
   */
  private _sendEvent(eventName: string, data?: any) {
    if (this.events) {
      this.events.notify(<any>{
        eventName,
        object: this,
        data: data
      });
    }
  }

  /**
   * Helper method to ensure audio focus.
   */
  private _requestAudioFocus(): boolean {
    // If it does not enter the condition block, means that we already
    // have focus. Therefore we have to start with `true`.
    let result = true;
    let focusResult = null;
    if (!this._mAudioFocusGranted) {
      const ctx = this._getAndroidContext();
      const am = ctx.getSystemService(
        android.content.Context.AUDIO_SERVICE
      ) as android.media.AudioManager;

      // Request audio focus for play back
      if (android.os.Build.VERSION.SDK_INT >= 26) {
        focusResult = am.requestAudioFocus(this._audioFocusRequest);
      } else {
        focusResult = am.requestAudioFocus(
          this._mOnAudioFocusChangeListener,
          android.media.AudioManager.STREAM_MUSIC,
          this._durationHint
        );
      }

      if (
        focusResult === android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED
      ) {
        result = true;
      } else {
        result = false;
      }
    }

    return result;
  }

  private _abandonAudioFocus(preserveMP: boolean = false): void {
    const ctx = this._getAndroidContext();
    const am = ctx.getSystemService(android.content.Context.AUDIO_SERVICE);
    let result = null;

    if (android.os.Build.VERSION.SDK_INT >= 26) {
      console.log('abandonAudioFocusRequest...', this._audioFocusRequest);
      result = am.abandonAudioFocusRequest(this._audioFocusRequest);
      console.log('abandonAudioFocusRequest...result...', result);

      // this._audioFocusRequest = null;
    } else {
      console.log('abandonAudioFocus...', this._mOnAudioFocusChangeListener);
      result = am.abandonAudioFocus(this._mOnAudioFocusChangeListener);
    }

    // Normally we will preserve the MediaPlayer only when pausing
    if (this._mediaPlayer && !preserveMP) {
      this._mediaPlayer.release();
      this._mediaPlayer = undefined;
    }
    if (result === android.media.AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
      this._mAudioFocusGranted = false;
    } else {
      console.log('Failed to abandon audio focus.');
    }
  }

  private _getAndroidContext() {
    let ctx = Application.android.context;
    if (!ctx) {
      ctx = Application.getNativeApplication().getApplicationContext();
    }

    if (ctx === null) {
      setTimeout(() => {
        this._getAndroidContext();
      }, 200);

      return;
    }

    return ctx;
  }
  /**
   * This getter will instantiate the MediaPlayer if needed
   * and register the listeners. This is done here to avoid
   * code duplication. This is also the reason why we have
   * a `_options`
   */
  private get _player() {
    if (!this._mediaPlayer && this._options) {
      this._mediaPlayer = new android.media.MediaPlayer();

      this._mediaPlayer.setOnCompletionListener(
        new android.media.MediaPlayer.OnCompletionListener({
          onCompletion: mp => {
            if (this._options && this._options.completeCallback) {
              if (this._options.loop === true) {
                mp.seekTo(5);
                mp.start();
              }
              this._options.completeCallback({ player: mp });
            }

            if (this._options && !this._options.loop) {
              // Make sure that we abandon audio focus when playback stops
              this._abandonAudioFocus(true);
            }
          }
        })
      );

      this._mediaPlayer.setOnErrorListener(
        new android.media.MediaPlayer.OnErrorListener({
          onError: (player: any, error: number, extra: number) => {
            if (this._options && this._options.errorCallback) {
              this._options.errorCallback({ player, error, extra });
            }
            this.dispose();
            return true;
          }
        })
      );
    }

    return this._mediaPlayer;
  }

  private _mOnAudioFocusChangeListener = new android.media.AudioManager.OnAudioFocusChangeListener(
    {
      onAudioFocusChange: (focusChange: number) => {
        switch (focusChange) {
          case android.media.AudioManager.AUDIOFOCUS_GAIN:
            // Set volume level to desired levels
            // if last volume more than 10 just set to 1.0 float
            if (this._lastPlayerVolume && this._lastPlayerVolume >= 10) {
              this.volume = 1.0;
            } else if (this._lastPlayerVolume) {
              this.volume = parseFloat(
                '0.' + this._lastPlayerVolume.toString()
              );
            }

            this.resume();
            break;
          case android.media.AudioManager.AUDIOFOCUS_GAIN_TRANSIENT:
            // You have audio focus for a short time
            break;
          case android.media.AudioManager.AUDIOFOCUS_LOSS:
            this.pause();
            break;
          case android.media.AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
            // Temporary loss of audio focus - expect to get it back - you can keep your resources around
            this.pause();
            break;
          case android.media.AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
            // Lower the volume, keep playing
            this._lastPlayerVolume = this.volume;
            this.volume = 0.2;
            break;
        }
      }
    }
  );
}

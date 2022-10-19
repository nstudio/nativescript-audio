<a align="center" href="https://www.npmjs.com/package/nativescript-audio">
    <h3 align="center">NativeScript Audio</h3>
</a>
<h4 align="center">NativeScript plugin to play and record audio files for Android and iOS.</h4>

<p align="center">
    <a href="https://www.npmjs.com/package/@nstudio/nativescript-audio">
        <img src="https://github.com/nstudio/nativescript-audio/workflows/Build%20CI/badge.svg" alt="Action Build">
    </a>
    <a href="https://www.npmjs.com/package/nativescript-audio">
        <img src="https://img.shields.io/npm/v/nativescript-audio.svg" alt="npm">
    </a>
</p>

---

## Installation

#### NativeScript 7+:

`ns plugin add nativescript-audio`

#### NativeScript Version prior to 7:

`tns plugin add nativescript-audio@5.1.1`

---

### Android Native Classes

- [Player - android.media.MediaPlayer](http://developer.android.com/reference/android/media/MediaPlayer.html)
- [Recorder - android.media.MediaRecorder](http://developer.android.com/reference/android/media/MediaRecorder.html)

### iOS Native Classes

- [Player - AVAudioPlayer](https://developer.apple.com/library/ios/documentation/AVFoundation/Reference/AVAudioPlayerClassReference/)
- [Recorder - AVAudioRecorder](https://developer.apple.com/library/ios/documentation/AVFoundation/Reference/AVAudioRecorder_ClassReference/)

### Permissions

#### iOS

You will need to grant permissions on iOS to allow the device to access the microphone if you are using the recording function. If you don't, your app may crash on device and/or your app might be rejected during Apple's review routine. To do this, add this key to your `app/App_Resources/iOS/Info.plist` file:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Recording Practice Sessions</string>
```

#### Android

If you are going to use the recorder capability for Android, you need to add the RECORD_AUDIO permission to your AndroidManifest.xml file located in App_Resources.

```xml
    <uses-permission android:name="android.permission.RECORD_AUDIO"/>
```

## Usage

### TypeScript Example

```typescript
import { TNSPlayer } from 'nativescript-audio';

export class YourClass {
  private _player: TNSPlayer;

  constructor() {
    this._player = new TNSPlayer();
    // You can pass a duration hint to control the behavior of other application that may
    // be holding audio focus.
    // For example: new  TNSPlayer(AudioFocusDurationHint.AUDIOFOCUS_GAIN_TRANSIENT);
    // Then when you play a song, the previous owner of the
    // audio focus will stop. When your song stops
    // the previous holder will resume.
    this._player.debug = true; // set true to enable TNSPlayer console logs for debugging.
    this._player
      .initFromFile({
        audioFile: '~/audio/song.mp3', // ~ = app directory
        loop: false,
        completeCallback: this._trackComplete.bind(this),
        errorCallback: this._trackError.bind(this)
      })
      .then(() => {
        this._player.getAudioTrackDuration().then(duration => {
          // iOS: duration is in seconds
          // Android: duration is in milliseconds
          console.log(`song duration:`, duration);
        });
      });
  }

  public togglePlay() {
    if (this._player.isAudioPlaying()) {
      this._player.pause();
    } else {
      this._player.play();
    }
  }

  private _trackComplete(args: any) {
    console.log('reference back to player:', args.player);
    // iOS only: flag indicating if completed succesfully
    console.log('whether song play completed successfully:', args.flag);
  }

  private _trackError(args: any) {
    console.log('reference back to player:', args.player);
    console.log('the error:', args.error);
    // Android only: extra detail on error
    console.log('extra info on the error:', args.extra);
  }

  // This is an example method for watching audio meters and converting the values from Android's arbitrary 
  // value to something close to dB. iOS reports values from -120 to 0, android reports values from 0 to about 37000.
  // The below method converts the values to db as close as I could figure out. You can tweak the .1 value to your discretion.
  // I am basically converting these numbers to something close to a percentage value. My handle Meter UI method
  // converts that value to a value I can use to pulse a circle bigger and smaller, representing your audio level. 
  private _initMeter() {
    this._resetMeter();
    this._meterInterval = this._win.setInterval(() => {
      this.audioMeter = this._recorder.getMeters();
      if (isIOS) {
        this.handleMeterUI(this.audioMeter+200)
      } else {
        let db = (20 * Math.log10(parseInt(this.audioMeter) / .1)); 
        let percentage = db + 85; 
        this.handleMeterUI(percentage)
      }
    }, 150);
  }

  handleMeterUI(percentage) {
    let scale = percentage/100;

    function map_range(value, in_low, in_high, out_low, out_high) {
      return out_low + (out_high - out_low) * (value - in_low) / (in_high - in_low);
    }
    let lerpScale = map_range(scale, 1.2, 1.9, 0.1, 2.1)
    if (scale > 0) {
      this.levelMeterCircleUI.animate({
        scale: {x: lerpScale, y: lerpScale},
        duration: 100
      }).then(() => {}).catch(() => {})
    }
    if (lerpScale > 2.2) {
      this.levelBgColor = 'rgba(255, 0, 0, 1)';
    } else {
      this.levelBgColor = 'rgb(0, 183, 0)';
    }
  }
}
```

### Javascript Example:

```javascript
const audio = require('nativescript-audio');

const player = new audio.TNSPlayer();
const playerOptions = {
  audioFile: 'http://some/audio/file.mp3',
  loop: false,
  completeCallback: function () {
    console.log('finished playing');
  },
  errorCallback: function (errorObject) {
    console.log(JSON.stringify(errorObject));
  },
  infoCallback: function (args) {
    console.log(JSON.stringify(args));
  }
};

player
  .playFromUrl(playerOptions)
  .then(res => {
    console.log(res);
  })
  .catch(err => {
    console.log('something went wrong...', err);
  });
```

## API

### Recorder

#### TNSRecorder Methods

| Method                                                      | Description                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| _TNSRecorder.CAN_RECORD()_: `boolean` - **_static method_** | Determine if ready to record.                                            |
| _start(options: AudioRecorderOptions)_: `Promise<void>`     | Start recording to file.                                                 |
| _stop()_: `Promise<void>`                                   | Stop recording.                                                          |
| _pause()_: `Promise<void>`                                  | Pause recording.                                                         |
| _resume()_: `Promise<void>`                                 | Resume recording.                                                        |
| _dispose()_: `Promise<void>`                                | Free up system resources when done with recorder.                        |
| _getMeters(channel?: number)_: `number`                     | Returns the amplitude of the input.                                      |
| _isRecording()_: `boolean` - **_iOS Only_**                 | Returns true if recorder is actively recording.                          |
| _requestRecordPermission()_: `Promise<void>`                | _Android Only_ Resolves the promise is user grants the permission.       |
| _hasRecordPermission()_: `boolean`                          | _Android Only_ Returns true if RECORD_AUDIO permission has been granted. |

#### TNSRecorder Instance Properties

| Property | Description                                                |
| -------- | ---------------------------------------------------------- |
| ios      | Get the native AVAudioRecorder class instance.             |
| android  | Get the native MediaRecorder class instance.               |
| debug    | Set true to enable debugging console logs (default false). |

#### TNSRecorder AudioRecorderOptions

| Property          | Type          | Description                                                |
| --------          | ------        |---------------------------------------------------------- |
| filename          | string        | Gets or sets the recorded file name.             |
| source            | int           |**Android Only** Sets the source for recording. Learn more here https://developer.android.com/reference/android/media/MediaRecorder.AudioSource               |
| maxDuration       | int           |Gets or set the max duration of the recording session. Input in milliseconds, which is Android's format. Will be converted appropriately for iOS. |
| metering          | boolean       |Enables metering. This will allow you to inspect the audio level by calling the record instance's `getMeters` ,method. This will return dB on iOS, but an arbitrary amplitude number for Android. See the metering example for a way to convert the output to something resembling dB on Android. |
| format            | int or enum   |The Audio format to record in. On Android, use these Enums: https://developer.android.com/reference/android/media/AudioFormat#ENCODING_PCM_16BIT On ios, use these format options: https://developer.apple.com/documentation/coreaudiotypes/1572096-audio_format_identifiers |
| channels          | int           | Number of channels to record (mono, st) |
| sampleRate        | int           | The sample rate to record in. Default: 44100 |
| bitRate           | int           | **Android Only** The bitrate to record in. iOS automatically calculates based on `iosAudioQuality` flag. Default: 128000 |
| encoder           | int or enum   | **Android Only**  Use https://developer.android.com/reference/android/media/MediaRecorder.AudioEncoder#AAC |
| iosAudioQuality   | string        | ios uses AVAudioQuality to determine encoder and bitrate. Accepts Min, Low, Medium, High, Max https://developer.apple.com/documentation/avfaudio/avaudioquality |
| errorCallback     | function      | Gets or sets the callback when an error occurs with the media recorder. Returns An object containing the native values for the error callback. |
| infoCallback      | function      | Gets or sets the callback to be invoked to communicate some info and/or warning about the media or its playback. Returns An object containing the native values for the info callback. |

### Player

#### TNSPlayer Methods

| Method                                                                 | Description                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| _initFromFile(options: AudioPlayerOptions)_: `Promise`                 | Initialize player instance with a file without auto-playing. |
| _playFromFile(options: AudioPlayerOptions)_: `Promise`                 | Auto-play from a file.                                       |
| _initFromUrl(options: AudioPlayerOptions)_: `Promise`                  | Initialize player instance from a url without auto-playing.  |
| _playFromUrl(options: AudioPlayerOptions)_: `Promise`                  | Auto-play from a url.                                        |
| _pause()_: `Promise<boolean>`                                          | Pause playback.                                              |
| _resume()_: `void`                                                     | Resume playback.                                             |
| _seekTo(time:number)_: `Promise<boolean>`                              | Seek to position of track (in seconds).                      |
| _dispose()_: `Promise<boolean>`                                        | Free up resources when done playing audio.                   |
| _isAudioPlaying()_: `boolean`                                          | Determine if player is playing.                              |
| _getAudioTrackDuration()_: `Promise<string>`                           | Duration of media file assigned to the player.               |
| _playAtTime(time: number)_: void - **_iOS Only_**                      | Play audio track at specific time of duration.               |
| _changePlayerSpeed(speed: number)_: void - **On Android Only API 23+** | Change the playback speed of the media player.               |

#### TNSPlayer Instance Properties

| Property                | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| _ios_                   | Get the native ios AVAudioPlayer instance.                 |
| _android_               | Get the native android MediaPlayer instance.               |
| _debug_: `boolean`      | Set true to enable debugging console logs (default false). |
| _currentTime_: `number` | Get the current time in the media file's duration.         |
| _volume_: `number`      | Get/Set the player volume. Value range from 0 to 1.        |

### License

[MIT](/LICENSE)

### Demo App

- fork/clone the repository
- cd into the `src` directory
- execute `npm run demo.android` or `npm run demo.ios` (scripts are located in the `scripts` of the package.json in the `src` directory if you are curious)

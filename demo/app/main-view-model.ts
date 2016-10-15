import {Observable} from 'data/observable';
import * as fs from 'file-system';
import * as app from 'application';
import * as color from 'color';
import * as platform from 'platform';
import * as dialogs from 'ui/dialogs';
import { SnackBar } from 'nativescript-snackbar';
import {TNSRecorder, TNSPlayer, AudioPlayerOptions, AudioRecorderOptions} from 'nativescript-audio';

declare var android;

export class AudioDemo extends Observable {
  public isPlaying: boolean;
  public isRecording: boolean;
  public recordedAudioFile: string;
  private recorder;
  private player;
  private audioSessionId;
  private page;
  private audioUrls: Array<any> = [
    { name: 'Fight Club', pic: '~/pics/canoe_girl.jpeg', url: 'http://www.noiseaddicts.com/samples_1w72b820/2514.mp3' },
    { name: 'To The Bat Cave!!!', pic: '~/pics/bears.jpeg', url: 'http://www.noiseaddicts.com/samples_1w72b820/17.mp3' },
    { name: 'Marlon Brando', pic: '~/pics/northern_lights.jpeg', url: 'http://www.noiseaddicts.com/samples_1w72b820/47.mp3' }
  ];
  private meterInterval: any;
  private _SnackBar: SnackBar;

  constructor() {
    super();

    this.player = new TNSPlayer();
    this.recorder = new TNSRecorder();
    this._SnackBar = new SnackBar();
  }

  public startRecord(args) {
    if (TNSRecorder.CAN_RECORD()) {

      var audioFolder = fs.knownFolders.currentApp().getFolder("audio");
      console.log(JSON.stringify(audioFolder));

      let androidFormat;
      let androidEncoder;
      if (platform.isAndroid) {
        // m4a
        // static constants are not available, using raw values here
        // androidFormat = android.media.MediaRecorder.OutputFormat.MPEG_4;
        androidFormat = 2;
        // androidEncoder = android.media.MediaRecorder.AudioEncoder.AAC;
        androidEncoder = 3;
      }

      let recordingPath = `${audioFolder.path}/recording.${this.platformExtension()}`;
      let recorderOptions: AudioRecorderOptions = {

        filename: recordingPath,

        format: androidFormat,

        encoder: androidEncoder,

        metering: true,

        infoCallback: () => {
          
        },

        errorCallback: () => {
          
          // snackbar.simple('Error recording.');
        }
      };


      this.recorder.start(recorderOptions).then((result) => {
        this.set("isRecording", true);
        if (recorderOptions.metering) {
          this.initMeter();
        }
      }, (err) => {
        this.set("isRecording", false);
        this.resetMeter();
        dialogs.alert(err);
      });
    } else {
      dialogs.alert("This device cannot record audio.");
    }
  }

  public stopRecord(args) {
    this.resetMeter();
    this.recorder.stop().then(() => {
      this.set("isRecording", false);
      this._SnackBar.simple("Recorder stopped");
      this.resetMeter();
    }, (ex) => {
      console.log(ex);
      this.set("isRecording", false);
      this.resetMeter();
    });
  }

  private initMeter() {
    this.resetMeter();
    this.meterInterval = setInterval(() => {
      console.log(this.recorder.getMeters());
    }, 500);
  }

  private resetMeter() {
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = undefined;
    }
  }

  public getFile(args) {
    try {
      var audioFolder = fs.knownFolders.currentApp().getFolder("audio");
      var recordedFile = audioFolder.getFile(`recording.${this.platformExtension()}`);
      console.log(JSON.stringify(recordedFile));
      console.log('recording exists: ' + fs.File.exists(recordedFile.path));
      this.set("recordedAudioFile", recordedFile.path);
    } catch (ex) {
      console.log(ex);
    }
  }
 

  public playRecordedFile(args) {

    var audioFolder = fs.knownFolders.currentApp().getFolder("audio");
    var recordedFile = audioFolder.getFile(`recording.${this.platformExtension()}`);
    console.log("RECORDED FILE : " + JSON.stringify(recordedFile));

    var playerOptions: AudioPlayerOptions = {
      audioFile: `~/audio/recording.${this.platformExtension()}`,
      loop: false,
      completeCallback: () => {
        this._SnackBar.simple("Audio file complete");
        this.set("isPlaying", false);
        if (!playerOptions.loop) {
          this.player.dispose().then(() => {
            console.log('DISPOSED');
          }, (err) => {
            console.log(err);
          });
        }

      },

      errorCallback: () => {
        dialogs.alert('Error callback');
        this.set("isPlaying", false);
      },

      infoCallback: () => {
        dialogs.alert('Info callback');
      }
    };


    this.player.playFromFile(playerOptions).then(() => {
      this.set("isPlaying", true);
    }, (err) => {
      console.log(err);
      this.set("isPlaying", false);
    });

  }



  /***** AUDIO PLAYER *****/

  public playAudio(filepath: string, fileType: string) {

    try {
      var playerOptions = {
        audioFile: filepath,

        completeCallback: () => {
          this._SnackBar.simple("Audio file complete");

          this.player.dispose().then(() => {
            this.set("isPlaying", false);
            console.log('DISPOSED');
          }, (err) => {
            console.log('ERROR disposePlayer: ' + err);
          });
        },

        errorCallback: (err) => {
          this._SnackBar.simple('Error occurred during playback.');
          console.log(err);
          this.set("isPlaying", false);
        },

        infoCallback: (info) => {
          dialogs.alert('Info callback: ' + info.msg);
          console.log("what: " + info);
        }
      };

      this.set("isPlaying", true);

      if (fileType === 'localFile') {
        this.player.playFromFile(playerOptions).then(() => {
          this.set("isPlaying", true);
        }, (err) => {
          console.log(err);
          this.set("isPlaying", false);
        });
      } else if (fileType === 'remoteFile') {
        this.player.playFromUrl(playerOptions).then(() => {
          this.set("isPlaying", true);
        }, (err) => {
          console.log(err);
          this.set("isPlaying", false);
        });
      }
    } catch (ex) {
      console.log(ex);
    }

  }


  /**
   * PLAY REMOTE AUDIO FILE
   */
  public playRemoteFile(args) {
    console.log('playRemoteFile');
    var filepath = 'http://www.noiseaddicts.com/samples_1w72b820/2514.mp3';

    this.playAudio(filepath, 'remoteFile');

  }


  public resumePlayer() {
    console.log(this.player);
    this.player.resume();
  }

  /**
   * PLAY LOCAL AUDIO FILE from app folder
   */
  public playLocalFile(args) {
    var filepath = '~/audio/angel.mp3';

    this.playAudio(filepath, 'localFile');

  }






  /**
   * PAUSE PLAYING
   */
  public pauseAudio(args) {
    this.player.pause().then(() => {
      this.set("isPlaying", false);
    }, (err) => {
      console.log(err);
      this.set("isPlaying", true);
    });
  }





  public stopPlaying(args) {
    this.player.dispose().then(() => {
      this._SnackBar.simple("Media Player Disposed");
    }, (err) => {
      console.log(err);
    });
  }


  /**
   * RESUME PLAYING
   */
  public resumePlaying(args) {
    console.log('START');
    this.player.start();
  }

  private platformExtension() {
    //'mp3'
    return `${app.android ? 'm4a' : 'caf'}`;
  }
}

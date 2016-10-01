export interface AudioPlayerOptions {
    audioFile: string;
    completeCallback?: Function;
    errorCallback?: Function;
    infoCallback?: Function;
}
export interface AudioRecorderOptions {
    filename: string;
    maxDuration?: number;
    metering?: boolean;
    format?: any;
    channels?: any;
    sampleRate?: any;
    bitRate?: any;
    encoder?: any;
    errorCallback?: Function;
    infoCallback?: Function;
}
export interface TNSPlayerI {
    playFromFile(options: AudioPlayerOptions): Promise<any>;
    playFromUrl(options: AudioPlayerOptions): Promise<any>;
    play(): Promise<boolean>;
    pause(): Promise<boolean>;
    seekTo(time: number): Promise<any>;
    dispose(): Promise<boolean>;
    isAudioPlaying(): boolean;
    getAudioTrackDuration(): Promise<string>;
}
export interface TNSRecordI {
    start(options: AudioRecorderOptions): Promise<any>;
    stop(): Promise<any>;
    dispose(): Promise<any>;
}
export declare class TNSPlayer {
    static ObjCProtocols: any[];
    private _player;
    private _task;
    private _completeCallback;
    private _errorCallback;
    private _infoCallback;
    playFromFile(options: AudioPlayerOptions): Promise<any>;
    playFromUrl(options: AudioPlayerOptions): Promise<any>;
    pause(): Promise<any>;
    seekTo(time: number): Promise<any>;
    play(): Promise<any>;
    dispose(): Promise<any>;
    isAudioPlaying(): boolean;
    getAudioTrackDuration(): Promise<string>;
    audioPlayerDidFinishPlayingSuccessfully(player?: any, flag?: boolean): void;
    private reset();
}
export declare class TNSRecorder {
    static ObjCProtocols: any[];
    private _recorder;
    private _recordingSession;
    static CAN_RECORD(): boolean;
    start(options: AudioRecorderOptions): Promise<any>;
    stop(): Promise<any>;
    dispose(): Promise<any>;
    isRecording(): any;
    getMeters(channel: number): any;
    audioRecorderDidFinishRecording(recorder: any, success: boolean): void;
}



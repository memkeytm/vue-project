import {fabric} from 'fabric'

export interface INode {
    load(): void;    
    render(time: number): void;
}


fabric.Image.filters.Redify = fabric.util.createClass(fabric.Image.filters.BaseFilter, {
    type: 'Redify',

    /**
     * Fragment source for the redify program
     */
    fragmentSource: 'precision highp float;\n' +
      'uniform sampler2D uTexture;\n' +
      'varying vec2 vTexCoord;\n' +
      'void main() {\n' +
        'vec4 color = texture2D(uTexture, vTexCoord);\n' +
        'color.g = 0.0;\n' +
        'color.b = 0.0;\n' +
        'gl_FragColor = color;\n' +
      '}',
  
    applyTo2d: function(options) {
      var imageData = options.imageData,
          data = imageData.data, i, len = data.length;
  
      for (i = 0; i < len; i += 4) {
        data[i + 1] = 0;
        data[i + 2] = 0;
      }

    }
  });

class Track{
    id : string;
    nodes: Array<INode> = new Array<INode>();    
}

abstract class timeLine {
    canvas:HTMLCanvasElement;
    videoTracks: Array<Track> = [];
    audioTracks: Array<Track> = [];
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    abstract load(data: any): void;

    public render(time: number) {
        [this.videoTracks, this.audioTracks].forEach(tracks=>{
            tracks.forEach(track => {
                track.nodes.forEach(node => {
                    node.render(time);
                });
            });
        })        
    }
}

class sourceCache extends Map<string, any>{
   private static instance: sourceCache;
   private constructor(){
       super();
   }

   public static getInstance(): sourceCache{
       this.instance = this.instance == null ? new sourceCache() : this.instance;
       return this.instance;
   }
}

class fabricTimeLine extends timeLine{
    load(data: any): void {
        let videoTrack:Track = new Track();
        //读取工程数据        
        this.videoTracks.push(videoTrack);

        let audioTrack:Track = new Track();
        this.audioTracks.push(audioTrack);
    }
}

class render {
    source: timeLine;
    playing: boolean = false;
    currentFrameIndex: number;
    totalFrameCount: number;
    public selfDriver: boolean = false;

    constructor(source: timeLine){
        this.source = source;
    }

    seek(time: number): void {
        let lastPlaying = this.playing;
        this.pause();        
        if (lastPlaying){
            this.play(time);
        }else{
            this.currentFrameIndex = time;
            this.doRender();
        }
    }

    play(time: number): void {
        this.currentFrameIndex = time;
        if (!this.playing){
            if (this.selfDriver){
                (function animloop() {
                    this.doRender();
                    this.currentTime++;
                    
                    if (this.currentTime < this.duration){
                        window.requestAnimationFrame(animloop);
                    }
                    else if (this.currentTime == this.duration){
                        //
                    }
                })();
            }
        }
    }

    pause(): void {
        this.playing = false;
    }

    stop(time: number): void {
        this.playing = false;
        this.seek(0);
    }

    doRender(){
        this.source.render(this.currentFrameIndex);
    }
}

type html5MediaElement = HTMLMediaElement | HTMLImageElement| HTMLAudioElement;

async function createHtml5Element<T extends html5MediaElement>
    (key: string, url: string, cls :{new(): T; }): Promise<T>
{
    return new Promise((resolve, reject)=>{
        if (sourceCache.getInstance().has(key)){
            resolve(sourceCache.getInstance()[key]);
        }else{
            let source = new cls();        
            source.src = this.conf['url'];
            source.onload = function(){                    
                resolve(source);
                sourceCache.getInstance()[key] = source;
            }     
        }                
    });
}

abstract class Node implements INode {
    private FCanvas: any;
    private fabricObj: any;
    protected conf: any;
    protected needBuffer: boolean;

    constructor(conf: any, fabric: any) {
        this.conf = conf;
        this.FCanvas = fabric;
        this.fabricObj = this.createFabricObj();
        //形成双向链接，方便更新数据
        this.fabricObj.node = this;
    }

    public render(time: number): void {

        if (!this.fabricObj){ //处理不可见元素的情况
            return;
        }

        if (time >= this.conf['from'] && time < this.conf['to']) {
            if (this.isFabricObjHasAdd()){
                this.FCanvas.add(this.fabricObj);
            }
            if (this.needBuffer){
                //通知需要缓冲
            }
        }else{
            this.FCanvas.remove(this.fabricObj);
        }
    }

    load():void{
        //更新坐标，大小，旋转角度等属性
        //this.fabricObj
        //挂载特效滤镜
    }

    addFilters():void{
        
        this.fabricObj.filters.push()
        this.fabricObj.applyFilters();
    }

    isFabricObjHasAdd():boolean{
      return false;  
    }

    abstract createFabricObj(): any;
}

class ImageNode extends Node {
      
    createFabricObj(): any { 
        let source = createHtml5Element(this.conf['id'], this.conf['url'], HTMLImageElement);                  
        return new fabric.Image(source, {
            left: this.conf['left'],
            top: this.conf['top'],
            angle: this.conf['angle'],
            opacity: this.conf['opacity']
        })
    }
}


class shapeNode extends Node{    
    createFabricObj() {        
        let loadFunc = async (resolve, reject)=>{
            return new Promise((resolve, reject)=>{
                let data = "";
                fabric.loadSVGFromString(data, function(objects, options) {
                    var obj = fabric.util.groupSVGElements(objects, options);
                    resolve(obj);
                });
            })
        };
    }
}

class gifNode extends Node{
    createFabricObj() {
        let source = null;
        return new fabric.Image(source, {
            left: this.conf['left'],
            top: this.conf['top'],
            angle: this.conf['angle'],
            opacity: this.conf['opacity'],

        })        
    }
}

class videoNode extends ImageNode{
    createFabricObj(): any {   
        let source1 = createHtml5Element(this.conf['id'], this.conf['url'], HTMLImageElement);  
        let source :HTMLVideoElement = null;
        let self = this;
        source.addEventListener('timeupdate', function(){
            if ((source.currentTime < self.conf['trimStart']) || source.currentTime > self.conf['trimEnd']){
                source.pause();
            }
        });

        return new fabric.Image(source, {
            left: this.conf['left'],
            top: this.conf['top'],
            angle: this.conf['angle'],
            opacity: this.conf['opacity'],
        })
    }

    public render(time: number): void {
        if (time >= this.conf['from'] && time < this.conf['to']) {
            let video = sourceCache.getInstance()[this.conf['key']];
            let seekPos = this.conf['trimStart'] + time - this.conf['from'];
            video.seek(seekPos);        
        }
        super.render(time);

    }    
}

class audioNode extends Node {

    createFabricObj(): any {
        let source1 = createHtml5Element(this.conf['id'], this.conf['url'], HTMLAudioElement);  
        let source :HTMLVideoElement = null;
        let self = this;        
        source.addEventListener('timeupdate', function(){
            if ((source.currentTime < self.conf['trimStart']) || source.currentTime > self.conf['trimEnd']){
                source.pause();
            }
        });
    }

    public render(time: number): void {
        if (time >= this.conf['from'] && time < this.conf['to']) {
            let audio = sourceCache.getInstance()[this.conf['key']];
            let seekPos = this.conf['trimStart'] + time - this.conf['from'];      
            audio.seek(seekPos);
        }
        super.render(time);
    }   
}

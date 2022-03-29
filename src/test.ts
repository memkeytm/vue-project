import {fabric} from 'fabric'

export interface INode {
    load(): void;    
    render(time: number): void;
}


fabric.Myfilters.base = fabric.util.createClass(fabric.Object, {
    type: 'AnchorPointMove',
  
    apply: function(options: any) {
        let startValue = options['startValue'],
        endValue = options['endValue'],
        duration = options['duration'],
        currentTime = options['currentTime'],
        easing = options['easing'],
        value = easing(currentTime, startValue, endValue, duration);
        this.filter(value);
    },

    filter: function(value: any){
        throw('no implemnt');
    }
});

fabric.Myfilters.AnchorPointMove = fabric.util.createClass(fabric.Myfilters.base, {
    filter: function(value){
        this.set(this.key, value)
        //this.container.set('anchorPoint', value);    
    }
})

fabric.Myfilters.opacity = fabric.util.createClass(fabric.Myfilters.base, {
    filter: function(value){
        this.container.set('opacity', value);    
    }
})

fabric.Myfilters.clipPath = fabric.util.createClass(fabric.Myfilters.base, {
    filter: function(value){
        var clipPath = new fabric.Circle({
            radius: value,
            top: this.top,//外面传入
            left: this.left//外面传入
          });        
        this.container.clipPath = clipPath;
    }
})


fabric.Container = fabric.util.createClass(fabric.Object, {
        initialize: function(obj, options) {
          this.callSuper('initialize', options);
          this.innerObj = obj;
        },

        _render: function(ctx) {
          if (this.loaded) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(
              -(this.width / 2) - this.H_PADDING,
              -(this.height / 2) - this.H_PADDING,
              this.width + this.H_PADDING * 2,
              this.height + this.V_PADDING * 2);
            //主要用来做左右，上下的变换
            //this.anchorPoint.x
            //this.anchorPoint.y
            //修改原点
            //ctx.translate(0,canvasHeight);
            this.innerObj.render(ctx);
            //ctx.drawImage(this.image, -this.width / 2, -this.height / 2);
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
    load(data: any, clear: boolean=false): void {
        let videoTrack:Track = new Track();
        //读取工程数据,同步对比数据        
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
    private animates: any;
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
            if (!this.isFabricObjHasAdd()){
                this.FCanvas.add(this.fabricObj);
            }
            this.applyAnimates(time);
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

    applyAnimates(time):void{        
        this.animates.forEach(animate => {
            animate.apply(time);
        });
    }

    isFabricObjHasAdd():boolean{
      return false;  
    }

    abstract createFabricObj(): any;
}

class ImageNode extends Node {      
    createFabricObj(): any { 
        let source = createHtml5Element(this.conf['id'], this.conf['url'], HTMLImageElement);                  
        return fabric.Container(new fabric.Image(source))
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
        //
        //return fabric.Container(new fabric.Image(source));
    }
}

class gifNode extends Node{
    createFabricObj() {
        let source = null;//canvas
        //构建gif解码器
        return fabric.Container(new fabric.Image(source));        
    }
}

class videoNode extends ImageNode{
    playbackRate : number;//后续倍速播放在这个基础上乘以倍速
    createFabricObj(): any {   
        let source1 = createHtml5Element(this.conf['id'], this.conf['url'], HTMLImageElement);  
        let source :HTMLVideoElement = null;
        //获取文件原始帧率
        let videoOrgFramerate = 30;
        this.playbackRate = videoOrgFramerate / 25
        source.playbackRate = this.playbackRate;
        let self = this;
        source.addEventListener('timeupdate', function(){
            if ((source.currentTime < self.conf['trimStart']) || source.currentTime > self.conf['trimEnd']){
                source.pause();
            }
        });

        return fabric.Container(new fabric.Image(source));
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
    playbackRate : number;//后续倍速播放在这个基础上乘以倍速
    createFabricObj(): any {
        let source1 = createHtml5Element(this.conf['id'], this.conf['url'], HTMLAudioElement);  
        let source :HTMLVideoElement = null;
        //获取文件原始帧率
        let videoOrgFramerate = 30;
        this.playbackRate = videoOrgFramerate / 25        
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

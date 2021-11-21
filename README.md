# vue-project
const path = require('path');
const { FFScene, FFVideo, FFImage, FFCreator} = require('../');

const forEach = require('lodash/forEach');

const hmsToSeconds = (hms) => {
  if (typeof hms === 'number') return hms;

  const a = hms.split(':');
  const seconds = +a[0] * 60 * 60 + +a[1] * 60 + +a[2];
  return seconds;
}

class trackItem {
  constructor(node, start, end){
    this.start = start;
    this.end = end;
    this.node = node;
  }
}

const createFFTask = () => {
  let project = {
    '0':[
        {
          'type': 'video',
          'url': path.join(__dirname, './assets/video/video1.mp4'),
          'ss': 0,
          'to': 200
        },
        {
          'type': 'video',          
          'url': path.join(__dirname, './assets/video/video1.mp4'),
          'ss': 0,
          'to': 200
        },    
    ]
  }

  new Media_IO_Render(project).start();
};

class Media_IO_Render{
  constructor(project){
    this.project = project;
    this.cacheDir = 'c:\\1\\cache';
    this.outputDir = 'c:\\1\\output';
    this.outputW = 800;
    this.outputH = 600;
  }

  start = async()=>{
    let confList = this.project[0]
    let trackVideo = this.getTrack(confList, this.outputW, this.outputH);
    let mainTrack = await this.buildMainTrack(trackVideo);
    if (mainTrack){
      const scene = new FFScene();
      scene.setBgColor('#FFFFFF');
      let video = new FFVideo({
        path: mainTrack['filename'],
        width: this.outputW,
        height: this.outputH
      })
      scene.addChild(video);
      scene.setDuration(mainTrack['duration']);
      return await this.render([scene], this.outputW, this.outputH)  
    }
  }

  getTrack = (aConfList, outputW, outputH)=>{
    let confList = aConfList || [];
    let track = [];
    forEach(confList, conf => {
      let node = new FFVideo(
        {
          path: conf.url,
          width: outputW,
          height: outputH,
          ss: conf.ss,
          to: conf.to,
        }
      );
      console.log(node);
      let start = hmsToSeconds(conf.ss);
      let end = hmsToSeconds(conf.to);
      let item = new trackItem(node, start, end);
      track.push(item);
    });
    return track;
  }

  buildMainTrack = async(track)=>{
    let totalDuration = 0;
    let scenes = [];
    forEach(track, trackItem=>{
        const scene = new FFScene();      
        scene.addChild(trackItem.node);
        let duration = hmsToSeconds(trackItem.end) - hmsToSeconds(trackItem.start);
        scene.setDuration(duration);
        if (trackItem.TransitionName)
          scene.setTransition(trackItem.TransitionName, 5);      
        scenes.push(scene);
        totalDuration += duration;
    });
    
    let fn = await this.render(scenes, this.outputW, this.outputH);
    console.log(fn);
    return {'filename':fn, 'duration': totalDuration}
  }

  render = async(scenes, outputW, outputH)=>{
    return new Promise((resolve, reject) => {
      const creator = new FFCreator({
        cacheDir: this.cacheDir,
        outputDir: this.outputDir,
        width: outputW,
        height: outputH,
        fps: 30,
        log: true,
        highWaterMark: '3mb',
      });   
  
      forEach(scenes, scene=>creator.addChild(scene));
  
      creator.on('start', () => {
        console.log(`FFCreator start`);
      });
  
      creator.on('error', e => {
        console.log(`FFCreator error: ${e.error}`);
        resolve(NaN);
      });
  
      creator.on('progress', e => {
        console.log((`FFCreator progress: ${(e.percent * 100) >> 0}%`));
      });
  
      creator.on('complete', e => {
        console.log(
          `FFCreator completed: \n USEAGE: ${e.useage} \n PATH: ${e.output} `,
        );
        resolve(e.output);
      });
  
      creator.start()
    })
  }

}

createFFTask();

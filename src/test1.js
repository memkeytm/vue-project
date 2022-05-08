function sendToServer(buffer){
}

function draw(arr){
}

function NextFrame(offlineAudioContext, originalAudioBuffer, index, FrameSize){
	const offset = index * FrameSize;
    const numberOfChannels = offlineAudioContext.destination.channelCount;
    // 存放截取的数据
    const cutAudioBuffer = offlineAudioContext.createBuffer(
        numberOfChannels,
        FrameSize,
        offlineAudioContext.sampleRate
    );
    // 将截取数据和截取后的数据放入对应的缓存中
    for (let channel = 0; channel < numberOfChannels; channel++) {
        const cutChannelData = cutAudioBuffer.getChannelData(channel);
        const originalChannelData = originalAudioBuffer.getChannelData(channel);
        const midData = originalChannelData.subarray(offset, FrameSize);       
        cutChannelData.set(midData);       
    }
	const bufferSource = offlineAudioContext.createBufferSource();
	bufferSource.buffer = buffer;
	bufferSource.connect(analyser);
	bufferSource[bufferSource.start ? "start" : "noteOn"](0);	
	//return bufferSource;
	await offlineAudioContext.startRendering();	
}


function render(originalAudioBuffer, fps){
	const framesCount = Math.trunc(originalAudioBuffer.length / fps); 

	const audioDuration = originalAudioBuffer.length / originalAudioBuffer.sampleRate; 
	const audioDataStep = Math.trunc(originalAudioBuffer.length / framesCount);	
	const offlineAudioContext = new OfflineAudioContext(numberOfChannels, numberOfChannels, sampleRate);
	const analyser = offlineAudioContext.createAnalyser(); 
    const gainNode = offlineAudioContext[offlineAudioContext.createGain ? "createGain" :"createGainNode"]();                   
    gainNode.connect(offlineAudioContext.destination);
    analyser.fftSize = size * 2;
    analyser.connect(gainNode); 
	for (let i = 0; i < framesCount; i++) {
		NextFrame(originalAudioBuffer, i , audioDataStep);
		const arr = new Uint8Array(analyser.frequencyBinCount);
		analyser.getByteFrequencyData(arr);
		const buffer = draw(arr);
		sendToServer(buffer);
	}
}

function renderAudioToVideo(){
  const fps = 25;
  const fn = '/3.mp3';
  const xhr = new XMLHttpRequest();
  const ac = new window.AudioContext();
  //let ac = new OfflineAudioContext(2,44100*40,44100);
   
  xhr.open("get", fn)
  xhr.responseType = "arraybuffer";
  xhr.onload = function(){        
    ac.decodeAudioData(xhr.response, function(buffer){
		render(buffer, fps)
    }
  }
}

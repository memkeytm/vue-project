function sendToServer(buffer){
}

function draw(arr){
}

async function NextFrame(originalAudioBuffer, index, FrameSize){
	return new Promise((resolve)=>{
		const numberOfChannels = 2;
		const sampleRate = 44100;
		const offlineAudioContext = new OfflineAudioContext(2, sampleRate*40, sampleRate);
		const offset = index * FrameSize;
		
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
			const midData = originalChannelData.subarray(offset, offset + FrameSize);       
			cutChannelData.set(midData);       
			//console.log(cutChannelData)
		}
		//console.log(cutChannelData)
		const bufferSource = offlineAudioContext.createBufferSource();
		bufferSource.buffer = cutAudioBuffer;
		const analyser = offlineAudioContext.createAnalyser(); 
		analyser.fftSize = 128 * 2;
		const gainNode = offlineAudioContext.createGain();                   	
		bufferSource.connect(gainNode); 
		gainNode.connect(analyser);
		analyser.connect(offlineAudioContext.destination);
		bufferSource.start();	
		//const arr = new Uint8Array(analyser.frequencyBinCount);
		//analyser.getByteFrequencyData(arr);
		

		offlineAudioContext.startRendering().then(()=>{	
			const arr = new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(arr);
			console.log(arr);	
			resolve(arr);
		});
	});
}


async function render(originalAudioBuffer, fps){
	const framesCount = Math.trunc(originalAudioBuffer.duration * fps); 
	const audioDataStep = Math.trunc(originalAudioBuffer.length / framesCount);	
    
	for (let i = 0; i < framesCount; i++) {
		await NextFrame(originalAudioBuffer, i , audioDataStep);
		//sendToServer(buffer);
	}
}

function renderAudioToVideo(){
  const fps = 25;
  const fn = '/3.mp3';
  const xhr = new XMLHttpRequest();
  //const ac = new window.AudioContext();
  let ac = new OfflineAudioContext(2,44100*40,44100);
   
  xhr.open("get", fn)
  xhr.responseType = "arraybuffer";
  xhr.onload = function(){        
    ac.decodeAudioData(xhr.response, function(buffer){
		render(buffer, fps)
    });
  }
  xhr.send();
}

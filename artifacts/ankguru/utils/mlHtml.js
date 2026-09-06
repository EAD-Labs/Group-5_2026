import { nnWeights } from './mnist_weights';

export const getMlHtml = () => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>
    const weights = ${JSON.stringify(nnWeights.weights)};
    const biases = ${JSON.stringify(nnWeights.biases)};

    function relu(x) { return Math.max(0, x); }
    function softmax(arr) {
      const max = Math.max(...arr);
      const exps = arr.map(x => Math.exp(x - max));
      const sum = exps.reduce((a, b) => a + b, 0);
      return exps.map(x => x / sum);
    }

    function predict(input) {
      if (!weights || weights.length === 0) return -1;
      
      const hiddenSize = biases[0].length;
      const hidden = new Array(hiddenSize).fill(0);
      for (let j = 0; j < hiddenSize; j++) {
        hidden[j] = biases[0][j];
        for (let i = 0; i < input.length; i++) {
          hidden[j] += input[i] * weights[0][i][j];
        }
        hidden[j] = relu(hidden[j]);
      }
      
      const outSize = biases[1].length;
      const output = new Array(outSize).fill(0);
      for (let j = 0; j < outSize; j++) {
        output[j] = biases[1][j];
        for (let i = 0; i < hiddenSize; i++) {
          output[j] += hidden[i] * weights[1][i][j];
        }
      }
      
      const probs = softmax(output);
      let maxProb = 0;
      let maxIdx = 0;
      for(let i=0; i<outSize; i++){
        if(probs[i] > maxProb){
          maxProb = probs[i];
          maxIdx = i;
        }
      }
      return maxIdx;
    }

    document.addEventListener('message', function(e) {
      try {
        const base64 = e.data;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;

          // Find bounding box of ink (non-white pixels)
          let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
          let hasInk = false;
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const idx = (y * canvas.width + x) * 4;
              const r = data[idx];
              const g = data[idx+1];
              const b = data[idx+2];
              const avg = (r+g+b)/3;
              if (avg < 240) { // ink threshold
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                hasInk = true;
              }
            }
          }

          if (!hasInk) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'prediction', digit: -1 }));
            return;
          }

          // Crop and resize to 28x28
          const cropW = maxX - minX;
          const cropH = maxY - minY;
          const size = Math.max(cropW, cropH) * 1.4; // 40% margin for MNIST look
          const cx = minX + cropW / 2;
          const cy = minY + cropH / 2;

          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = 28;
          smallCanvas.height = 28;
          const sCtx = smallCanvas.getContext('2d');
          
          sCtx.fillStyle = 'white';
          sCtx.fillRect(0, 0, 28, 28);
          sCtx.drawImage(
            canvas,
            cx - size/2, cy - size/2, size, size,
            0, 0, 28, 28
          );

          const sData = sCtx.getImageData(0, 0, 28, 28).data;
          const input = new Array(784);
          for (let i = 0; i < 784; i++) {
            const idx = i * 4;
            const r = sData[idx];
            const g = sData[idx+1];
            const b = sData[idx+2];
            // Normalize: 0 is white (0), 1 is black (1)
            const darkness = 255 - ((r+g+b)/3);
            input[i] = darkness / 255.0;
          }

          const digit = predict(input);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'prediction', digit }));
        };
        img.src = base64;
      } catch (err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'prediction', digit: -1, error: err.message }));
      }
    });
  </script>
</head>
<body></body>
</html>
`;
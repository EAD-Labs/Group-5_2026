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
      // hidden layer
      const hidden = new Array(32).fill(0);
      for (let j = 0; j < 32; j++) {
        hidden[j] = biases[0][j];
        for (let i = 0; i < 64; i++) {
          hidden[j] += input[i] * weights[0][i][j];
        }
        hidden[j] = relu(hidden[j]);
      }
      // output layer
      const output = new Array(10).fill(0);
      for (let j = 0; j < 10; j++) {
        output[j] = biases[1][j];
        for (let i = 0; i < 32; i++) {
          output[j] += hidden[i] * weights[1][i][j];
        }
      }
      const probs = softmax(output);
      let maxProb = 0;
      let maxIdx = 0;
      for(let i=0; i<10; i++){
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
              // darkness
              const r = data[idx];
              const g = data[idx+1];
              const b = data[idx+2];
              const avg = (r+g+b)/3;
              if (avg < 200) { // arbitrary threshold for ink
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

          // Crop and resize to 8x8
          const cropW = maxX - minX;
          const cropH = maxY - minY;
          const size = Math.max(cropW, cropH) * 1.2; // add 20% margin
          const cx = minX + cropW / 2;
          const cy = minY + cropH / 2;

          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = 8;
          smallCanvas.height = 8;
          const sCtx = smallCanvas.getContext('2d');
          sCtx.fillStyle = 'white';
          sCtx.fillRect(0, 0, 8, 8);
          sCtx.drawImage(
            canvas,
            cx - size/2, cy - size/2, size, size,
            0, 0, 8, 8
          );

          const sData = sCtx.getImageData(0, 0, 8, 8).data;
          const input = new Array(64);
          for (let i = 0; i < 64; i++) {
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
      } catch(err) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.message }));
      }
    });
  </script>
</head>
<body></body>
</html>
`;
 


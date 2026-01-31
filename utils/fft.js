// utils/fft.js
export default class FFT {
  constructor(size) {
    this.size = size;
    this.real = new Float32Array(size);
    this.imag = new Float32Array(size);

    this._buildTwiddles();
  }

  _buildTwiddles() {
    const N = this.size;
    this.twiddleReal = new Float32Array(N);
    this.twiddleImag = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const angle = -2 * Math.PI * i / N;
      this.twiddleReal[i] = Math.cos(angle);
      this.twiddleImag[i] = Math.sin(angle);
    }
  }

  inverseTransform() {
    const N = this.size;
    const outR = new Float32Array(N);
    const outI = new Float32Array(N);

    for (let k = 0; k < N; k++) {
      let sumR = 0;
      let sumI = 0;

      for (let n = 0; n < N; n++) {
        const idx = (k * n) % N;
        const wr = this.twiddleReal[idx];
        const wi = -this.twiddleImag[idx]; // inverse

        const xr = this.real[n];
        const xi = this.imag[n];

        sumR += xr * wr - xi * wi;
        sumI += xr * wi + xi * wr;
      }

      outR[k] = sumR / N;
      outI[k] = sumI / N;
    }

    this.real = outR;
    this.imag = outI;
  }
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Jimp = require('jimp');

/**
 * Fungsi untuk memproses gambar sebelum OCR untuk meningkatkan akurasi
 * Menggunakan library Jimp untuk manipulasi gambar
 */
export const preprocessImage = async (base64Image: string): Promise<string> => {
  try {
    console.log('Memulai pra-pemrosesan gambar dengan Jimp...');
    
    // Konversi base64 menjadi buffer
    let imageBuffer: Buffer;
    
    if (base64Image.startsWith('data:image')) {
      // Jika gambar adalah data URL, ekstrak bagian base64-nya
      const base64Data = base64Image.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Jika sudah base64 string
      imageBuffer = Buffer.from(base64Image, 'base64');
    }
    
    // Baca gambar dengan Jimp
    const image = await Jimp.read(imageBuffer);
    
    // Analisis histogram gambar untuk deteksi otomatis
    const histogramData = analyzeHistogram(image);
    
    // Terapkan serangkaian transformasi untuk meningkatkan keterbacaan teks
    image
      // Resize jika gambar terlalu besar (maks 1500px)
      .scaleToFit(1500, 1500)
      // Ubah ke grayscale
      .grayscale();
      
    // Jika gambar cenderung gelap, tingkatkan brightness
    if (histogramData.meanBrightness < 100) {
      image.brightness(0.15);  // Tingkatkan brightness untuk gambar gelap
    } else if (histogramData.meanBrightness > 200) {
      image.brightness(-0.1);  // Kurangi brightness untuk gambar sangat terang
    }
    
    // Tingkatkan kontras secara dinamis berdasarkan analisis histogram
    const contrastLevel = histogramData.contrastLevel < 50 ? 0.3 : 0.2;
    image.contrast(contrastLevel);
    
      // Normalize - menyebarkan nilai pixel di seluruh rentang
    image.normalize();
    
    // Lakukan thresholding manual untuk teks
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Deteksi area terang vs gelap dan pilih threshold yang sesuai
    let brightPixels = 0;
    let totalPixels = width * height;
    
    image.scan(0, 0, width, height, function(this: any, x: number, y: number, idx: number) {
      const gray = this.bitmap.data[idx];
      if (gray > 128) {
        brightPixels++;
      }
    });
    
    const brightRatio = brightPixels / totalPixels;
    console.log(`Rasio piksel terang: ${brightRatio.toFixed(2)}`);
    
    // Tentukan threshold berdasarkan rasio terang/gelap
    let threshold = 128;
    if (brightRatio > 0.75) {
      // Gambar terang, gunakan threshold lebih tinggi
      threshold = 160;
    } else if (brightRatio < 0.25) {
      // Gambar gelap, gunakan threshold lebih rendah
      threshold = 100;
    }
    
    // Terapkan adaptive thresholding jika rasio kontras rendah
    if (histogramData.contrastLevel < 40) {
      applyAdaptiveThreshold(image, 15, 5); // Block size 15, constant 5
    } else {
    // Terapkan threshold
    image.scan(0, 0, width, height, function(this: any, x: number, y: number, idx: number) {
      const gray = this.bitmap.data[idx];
      const newValue = gray > threshold ? 255 : 0;
      
      // Set R, G, B ke nilai baru
      this.bitmap.data[idx] = newValue;     // R
      this.bitmap.data[idx + 1] = newValue; // G
      this.bitmap.data[idx + 2] = newValue; // B
      // Alpha channel tetap 255
    });
    }
    
    // Sharpening untuk meningkatkan ketajaman teks
    image.sharpen(0.5);
    
    // Konversi kembali ke base64
    const mimeType = 'image/png';
    const processedBase64 = await image.getBase64Async(mimeType);
    
    console.log('Pra-pemrosesan gambar selesai');
    return processedBase64;
  } catch (error) {
    console.error('Error dalam pra-pemrosesan gambar:', error);
    return base64Image; // Kembalikan gambar asli jika ada error
  }
};

/**
 * Analisis histogram gambar untuk keputusan pengolahan yang lebih baik
 */
function analyzeHistogram(image: any) {
  const width = image.getWidth();
  const height = image.getHeight();
  
  // Array untuk histogram
  const histogram = new Array(256).fill(0);
  let totalBrightness = 0;
  
  // Hitung histogram
  image.scan(0, 0, width, height, function(this: any, x: number, y: number, idx: number) {
    const gray = this.bitmap.data[idx];
    histogram[gray]++;
    totalBrightness += gray;
  });
  
  // Hitung brightness rata-rata
  const meanBrightness = totalBrightness / (width * height);
  
  // Hitung standar deviasi untuk kontras
  let variance = 0;
  image.scan(0, 0, width, height, function(this: any, x: number, y: number, idx: number) {
    const gray = this.bitmap.data[idx];
    variance += Math.pow(gray - meanBrightness, 2);
  });
  
  const stdDev = Math.sqrt(variance / (width * height));
  const contrastLevel = stdDev;
  
  return {
    histogram,
    meanBrightness,
    contrastLevel
  };
}

/**
 * Implementasi adaptive thresholding sederhana
 * blockSize: ukuran block untuk adaptasi
 * c: konstanta yang dikurangkan dari rata-rata
 */
function applyAdaptiveThreshold(image: any, blockSize: number, c: number) {
  const width = image.getWidth();
  const height = image.getHeight();
  
  // Buat salinan gambar untuk perhitungan rata-rata
  const origBitmap = [...image.bitmap.data];
  
  // Terapkan thresholding adaptif
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Hitung rata-rata lokal
      let sum = 0;
      let count = 0;
      
      // Block di sekitar pixel
      const halfBlock = Math.floor(blockSize / 2);
      for (let wy = Math.max(0, y - halfBlock); wy < Math.min(height, y + halfBlock + 1); wy++) {
        for (let wx = Math.max(0, x - halfBlock); wx < Math.min(width, x + halfBlock + 1); wx++) {
          const idx = (wy * width + wx) * 4;
          sum += origBitmap[idx];
          count++;
        }
      }
      
      // Hitung rata-rata dan threshold
      const mean = sum / count;
      const threshold = mean - c;
      
      // Indeks pixel saat ini
      const idx = (y * width + x) * 4;
      const pixelValue = origBitmap[idx];
      
      // Terapkan threshold
      const newValue = pixelValue > threshold ? 255 : 0;
      image.bitmap.data[idx] = newValue;
      image.bitmap.data[idx + 1] = newValue;
      image.bitmap.data[idx + 2] = newValue;
    }
  }
}

/**
 * Membuat beberapa variasi gambar untuk diproses OCR
 * Mengembalikan array dari base64 strings
 */
export const createImageVariations = async (base64Image: string): Promise<string[]> => {
  try {
    console.log('Membuat variasi gambar untuk OCR...');
    
    // Konversi base64 menjadi buffer
    let imageBuffer: Buffer;
    
    if (base64Image.startsWith('data:image')) {
      // Jika gambar adalah data URL, ekstrak bagian base64-nya
      const base64Data = base64Image.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Jika sudah base64 string
      imageBuffer = Buffer.from(base64Image, 'base64');
    }
    
    // Baca gambar dengan Jimp
    const originalImage = await Jimp.read(imageBuffer);
    
    // Analisis histogram gambar untuk keputusan cerdas
    const histogramData = analyzeHistogram(originalImage);
    
    // Buat salinan untuk setiap variasi
    const normalizedImage = originalImage.clone();
    const invertedImage = originalImage.clone();
    const highContrastImage = originalImage.clone();
    const sharpImage = originalImage.clone();
    const edgeEnhancedImage = originalImage.clone();
    const bitonalImage = originalImage.clone();
    const dilatedImage = originalImage.clone();
    
    // Variasi 1: Normalisasi dan grayscale (biasanya bekerja dengan baik untuk teks)
    normalizedImage
      .grayscale()
      .normalize();
    
    // Variasi 2: Inversi warna (kadang membantu untuk teks terang di latar belakang gelap)
    invertedImage
      .grayscale()
      .invert();
    
    // Variasi 3: Kontras tinggi dinamis berdasarkan kontras gambar asli
    const contrastLevel = histogramData.contrastLevel < 50 ? 0.6 : 0.4;
    highContrastImage
      .grayscale()
      .contrast(contrastLevel)
      .brightness(histogramData.meanBrightness < 120 ? 0.15 : -0.05);
    
    // Variasi 4: Ketajaman ekstra
    sharpImage
      .grayscale()
      .normalize()
      .contrast(0.2)
      .sharpen(1);
      
    // Variasi 5: Edge enhancement untuk text detection
    const edgedImage = edgeEnhancedImage
      .grayscale()
      .convolute([
        [-1, -1, -1],
        [-1,  9, -1],
        [-1, -1, -1]
      ]);
    
    // Variasi 6: Bitonal dengan threshold dinamis
    let threshold = 128;
    if (histogramData.meanBrightness < 100) {
      threshold = 100;  // Lebih rendah untuk gambar gelap
    } else if (histogramData.meanBrightness > 200) {
      threshold = 180;  // Lebih tinggi untuk gambar terang
    }
    
    bitonalImage
      .grayscale();
    
    const width = bitonalImage.getWidth();
    const height = bitonalImage.getHeight();
    
    // Terapkan threshold
    bitonalImage.scan(0, 0, width, height, function(this: any, x: number, y: number, idx: number) {
      const gray = this.bitmap.data[idx];
      const newValue = gray > threshold ? 255 : 0;
      
      // Set R, G, B ke nilai baru
      this.bitmap.data[idx] = newValue;     // R
      this.bitmap.data[idx + 1] = newValue; // G
      this.bitmap.data[idx + 2] = newValue; // B
    });
    
    // Variasi 7: Dilated untuk teks tipis atau terpotong
    const dilatedVersion = dilatedImage
      .grayscale()
      .brightness(0.1);
    
    // Menerapkan operasi dilasi sederhana pada teks gelap
    applyDilation(dilatedVersion, 1);
    
    // Konversi setiap gambar ke base64
    const variations = await Promise.all([
      // Gambar asli (tanpa pemrosesan)
      base64Image,
      // Variasi yang diproses sebelumnya
      await preprocessImage(base64Image),
      // Normalisasi saja
      await normalizedImage.getBase64Async('image/png'),
      // Inversi
      await invertedImage.getBase64Async('image/png'),
      // Kontras tinggi
      await highContrastImage.getBase64Async('image/png'),
      // Ketajaman ekstra
      await sharpImage.getBase64Async('image/png'),
      // Edge enhancement
      await edgedImage.getBase64Async('image/png'),
      // Bitonal
      await bitonalImage.getBase64Async('image/png'),
      // Dilated
      await dilatedVersion.getBase64Async('image/png')
    ]);
    
    console.log(`Dibuat ${variations.length} variasi gambar untuk OCR`);
    return variations;
  } catch (error) {
    console.error('Error membuat variasi gambar:', error);
    return [base64Image]; // Kembalikan hanya gambar asli jika terjadi error
  }
};

/**
 * Menerapkan operasi dilasi sederhana pada gambar
 * radius: ukuran kernel dilasi
 */
function applyDilation(image: any, radius: number) {
  const width = image.getWidth();
  const height = image.getHeight();
  
  // Salin data bitmap untuk operasi dilasi
  const origBitmap = [...image.bitmap.data];
  
  // Lakukan operasi dilasi untuk pixel gelap (teks)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Indeks piksel saat ini
      const idx = (y * width + x) * 4;
      
      // Jika pixel gelap (teks), lihat apakah ada piksel terang di sekitarnya
      if (origBitmap[idx] < 100) {  // piksel gelap, mungkin teks
        let minValue = origBitmap[idx];
        
        // Cek piksel di sekitarnya
        for (let oy = -radius; oy <= radius; oy++) {
          for (let ox = -radius; ox <= radius; ox++) {
            const nx = x + ox;
            const ny = y + oy;
            
            // Pastikan koordinat valid
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const neighborIdx = (ny * width + nx) * 4;
              minValue = Math.min(minValue, origBitmap[neighborIdx]);
            }
          }
        }
        
        // Terapkan nilai minimum (dilasi untuk teks gelap)
        image.bitmap.data[idx] = minValue;
        image.bitmap.data[idx + 1] = minValue;
        image.bitmap.data[idx + 2] = minValue;
      }
    }
  }
}

/**
 * Fungsi untuk deteksi apakah gambar memiliki teks yang signifikan
 */
export const hasSignificantText = async (base64Image: string): Promise<boolean> => {
  try {
    // Konversi base64 menjadi buffer
    let imageBuffer: Buffer;
    
    if (base64Image.startsWith('data:image')) {
      // Jika gambar adalah data URL, ekstrak bagian base64-nya
      const base64Data = base64Image.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Jika sudah base64 string
      imageBuffer = Buffer.from(base64Image, 'base64');
    }
    
    // Baca gambar dengan Jimp
    const image = await Jimp.read(imageBuffer);
    
    // Ubah ke grayscale
    image.grayscale();
    
    // Hitung variasi piksel dalam gambar (gambar dengan teks memiliki variasi tinggi)
    const width = image.getWidth();
    const height = image.getHeight();
    
    let edgeCount = 0;
    const edgeThreshold = 30;
    
    // Scan untuk menemukan edge (tepi), yang biasanya menunjukkan teks
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerPixel = image.getPixelColor(x, y);
        const rightPixel = image.getPixelColor(x + 1, y);
        const bottomPixel = image.getPixelColor(x, y + 1);
        
        const centerGray = Jimp.intToRGBA(centerPixel).r;
        const rightGray = Jimp.intToRGBA(rightPixel).r;
        const bottomGray = Jimp.intToRGBA(bottomPixel).r;
        
        // Jika ada perbedaan besar antara piksel yang berdekatan, ini mungkin tepi (edge)
        if (Math.abs(centerGray - rightGray) > edgeThreshold || 
            Math.abs(centerGray - bottomGray) > edgeThreshold) {
          edgeCount++;
        }
      }
    }
    
    // Hitung rasio tepi terhadap jumlah piksel
    const totalPixels = width * height;
    const edgeRatio = edgeCount / totalPixels;
    
    console.log(`Rasio tepi terdeteksi: ${edgeRatio.toFixed(4)}`);
    
    // Gambar dengan teks biasanya memiliki rasio tepi lebih dari 0.01
    return edgeRatio > 0.01;
  } catch (error) {
    console.error('Error dalam deteksi teks:', error);
    return true; // Asumsikan ada teks jika terjadi error
  }
};

export const imageProcessingService = {
  preprocessImage,
  createImageVariations,
  hasSignificantText
}; 
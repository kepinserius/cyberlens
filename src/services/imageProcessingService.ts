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
    
    // Terapkan serangkaian transformasi untuk meningkatkan keterbacaan teks
    image
      // Resize jika gambar terlalu besar (maks 1500px)
      .scaleToFit(1500, 1500)
      // Ubah ke grayscale
      .grayscale()
      // Tingkatkan kontras
      .contrast(0.2)
      // Brightness - opsional, tergantung gambar
      .brightness(0.05)
      // Normalize - menyebarkan nilai pixel di seluruh rentang
      .normalize();
    
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
      threshold = 150;
    } else if (brightRatio < 0.25) {
      // Gambar gelap, gunakan threshold lebih rendah
      threshold = 100;
    }
    
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
    
    // Tambahkan sedikit blur untuk mengurangi noise (opsional)
    // image.blur(0.5);
    
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
    
    // Buat salinan untuk setiap variasi
    const normalizedImage = originalImage.clone();
    const invertedImage = originalImage.clone();
    const highContrastImage = originalImage.clone();
    const sharpImage = originalImage.clone();
    
    // Variasi 1: Normalisasi dan grayscale (biasanya bekerja dengan baik untuk teks)
    normalizedImage
      .grayscale()
      .normalize();
    
    // Variasi 2: Inversi warna (kadang membantu untuk teks terang di latar belakang gelap)
    invertedImage
      .grayscale()
      .invert();
    
    // Variasi 3: Kontras tinggi
    highContrastImage
      .grayscale()
      .contrast(0.5)
      .brightness(0.05);
    
    // Variasi 4: Ketajaman ekstra
    sharpImage
      .grayscale()
      .normalize()
      .contrast(0.2)
      .sharpen(1);
    
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
      await sharpImage.getBase64Async('image/png')
    ]);
    
    console.log(`Dibuat ${variations.length} variasi gambar untuk OCR`);
    return variations;
  } catch (error) {
    console.error('Error membuat variasi gambar:', error);
    return [base64Image]; // Kembalikan hanya gambar asli jika terjadi error
  }
};

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
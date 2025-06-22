// DeepSeek API Service
import { DEEPSEEK_API_KEY, DEEPSEEK_API_URL, DEFAULT_VALUES } from '../config';

interface DeepSeekResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface AnalysisRequest {
  text: string;
}

interface AnalysisResult {
  threatLevel: 'safe' | 'medium' | 'high';
  confidence: number;
  threatType?: string;
  recommendations: string[];
  analysis: string;
}

export async function analyzeTextWithDeepSeek(text: string): Promise<AnalysisResult> {
  try {
    console.log('Analyzing text with DeepSeek API...');
    
    if (!text || text.trim().length === 0) {
      throw new Error('Tidak ada teks untuk dianalisis');
    }
    
    // Prepare the prompt for DeepSeek
    const prompt = `
      Analisis teks berikut untuk mendeteksi potensi ancaman keamanan seperti phishing, penipuan, atau konten berbahaya lainnya.
      Teks mungkin dalam bahasa Inggris atau Indonesia.
      
      Teks:
      """
      ${text}
      """
      
      Berikan respon dalam format JSON dengan struktur berikut:
      {
        "threatLevel": "safe|medium|high",
        "confidence": <nilai antara 0-100>,
        "threatType": "<jenis ancaman jika terdeteksi>",
        "recommendations": ["rekomendasi 1", "rekomendasi 2", ...],
        "analysis": "<analisis singkat tentang teks>"
      }
      
      Jika teks dalam bahasa Inggris, berikan respons dalam bahasa Inggris.
      Jika teks dalam bahasa Indonesia, berikan respons dalam bahasa Indonesia.
      
      Jangan sertakan penjelasan atau teks lain selain JSON yang valid.
    `;
    
    // Fallback to local analysis if API call fails
    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('DeepSeek API error:', errorData);
        throw new Error(`DeepSeek API error: ${response.status}`);
      }
      
      const data: DeepSeekResponse = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('Tidak ada respon dari DeepSeek API');
      }
      
      // Parse the JSON response
      try {
        // Coba bersihkan respons sebelum parsing
        let cleanedContent = content.trim();
        
        // Hapus markdown code blocks jika ada
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```\n/, '').replace(/\n```$/, '');
        }
        
        const result = JSON.parse(cleanedContent);
        return {
          threatLevel: result.threatLevel,
          confidence: result.confidence,
          threatType: result.threatType,
          recommendations: result.recommendations,
          analysis: result.analysis
        };
      } catch (parseError) {
        console.error('Error parsing DeepSeek response:', parseError);
        console.error('Original response:', content);
        throw new Error('Format respon DeepSeek tidak valid');
      }
    } catch (apiError) {
      console.error('Error calling DeepSeek API, falling back to local analysis:', apiError);
      return analyzeTextLocally(text);
    }
  } catch (error) {
    console.error('Error in DeepSeek analysis:', error);
    return analyzeTextLocally(text);
  }
}

// Fallback local analysis
function analyzeTextLocally(text: string): AnalysisResult {
  console.log('Using local analysis fallback');
  
  // Deteksi bahasa (simple detection)
  const isIndonesian = detectIndonesianLanguage(text);
  
  // Kata kunci yang dapat menunjukkan potensi ancaman
  const HIGH_RISK_KEYWORDS = [
    // Indonesian keywords
    'password', 'kata sandi', 'kredit', 'kartu kredit', 'rekening', 'bank', 'transfer', 
    'dana', 'uang', 'bayar', 'kirim', 'verifikasi', 'akun', 'login', 'masuk', 'klik', 
    'tautan', 'link', 'mendesak', 'segera', 'darurat', 'batas waktu', 'deadline', 
    'hadiah', 'menang', 'undian', 'lotere', 'bitcoin', 'crypto', 'wallet',
    // English keywords
    'password', 'credit', 'credit card', 'account', 'bank', 'transfer', 
    'money', 'pay', 'send', 'verify', 'account', 'login', 'click', 
    'link', 'urgent', 'immediately', 'emergency', 'deadline', 
    'prize', 'win', 'lottery', 'bitcoin', 'crypto', 'wallet'
  ];
  
  const MEDIUM_RISK_KEYWORDS = [
    // Indonesian keywords
    'promo', 'diskon', 'gratis', 'free', 'bonus', 'penawaran', 'terbatas', 'limited', 
    'kesempatan', 'opportunity', 'investasi', 'keuntungan', 'profit', 'penghasilan', 
    'income', 'jutaan', 'milyaran', 'ratusan', 'ribuan',
    // English keywords
    'promo', 'discount', 'free', 'bonus', 'offer', 'limited', 
    'opportunity', 'investment', 'profit', 'income', 
    'millions', 'billions', 'hundreds', 'thousands'
  ];
  
  // Pola teks yang mencurigakan (support untuk Inggris dan Indonesia)
  const SUSPICIOUS_PATTERNS = [
    // Indonesian patterns
    /\b(password|kata\s*sandi|pin)\b.{0,30}\b(kirim|berikan|masukkan)\b/i,
    /\b(bank|rekening|kartu\s*kredit).{0,50}\b(verifikasi|konfirmasi)\b/i,
    /\b(menang|hadiah|undian).{0,50}\b(klaim|ambil|dapatkan)\b/i,
    /\b(bayar|transfer).{0,30}\b(sekarang|segera|hari\s*ini)\b/i,
    /\b(klik|buka).{0,20}\b(link|tautan|url)\b/i,
    // English patterns
    /\b(password|pin)\b.{0,30}\b(send|give|enter)\b/i,
    /\b(bank|account|credit\s*card).{0,50}\b(verify|confirm)\b/i,
    /\b(won|prize|lottery).{0,50}\b(claim|get)\b/i,
    /\b(pay|transfer).{0,30}\b(now|immediately|today)\b/i,
    /\b(click|open).{0,20}\b(link|url)\b/i
  ];
  
  // Menghitung skor ancaman
  let threatScore = 0;
  let matchedKeywords: string[] = [];
  let detectedPatterns = 0;
  
  // Periksa kata kunci berisiko tinggi
  HIGH_RISK_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(text)) {
      threatScore += 15;
      matchedKeywords.push(keyword);
    }
  });
  
  // Periksa kata kunci berisiko sedang
  MEDIUM_RISK_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(text)) {
      threatScore += 5;
      matchedKeywords.push(keyword);
    }
  });
  
  // Periksa pola mencurigakan
  SUSPICIOUS_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) {
      threatScore += 20;
      detectedPatterns++;
    }
  });
  
  // Tentukan level ancaman berdasarkan skor
  let threatLevel: 'safe' | 'medium' | 'high' = 'safe';
  let confidence = 75;
  let threatType = '';
  let recommendations: string[] = [];
  let analysis = '';
  
  if (threatScore >= 50) {
    threatLevel = 'high';
    confidence = Math.min(95, 75 + threatScore / 5);
    
    if (isIndonesian) {
      // Indonesian threat types and recommendations
      if (text.match(/\b(bank|rekening|kartu\s*kredit)\b/i)) {
        threatType = 'phishing keuangan';
        recommendations = [
          'Jangan memberikan informasi keuangan atau pribadi',
          'Verifikasi langsung dengan pihak resmi melalui saluran yang terpercaya',
          'Laporkan pesan ini ke pihak berwenang'
        ];
        analysis = 'Teks ini berisi permintaan informasi keuangan yang mencurigakan dan mungkin merupakan upaya phishing.';
      } else if (text.match(/\b(hadiah|menang|undian|lotere)\b/i)) {
        threatType = 'penipuan hadiah';
        recommendations = [
          'Abaikan pesan ini - hadiah yang sah tidak meminta biaya di muka',
          'Jangan transfer uang atau memberikan informasi pribadi',
          'Laporkan ke platform tempat Anda menerima pesan ini'
        ];
        analysis = 'Teks ini berisi penawaran hadiah yang mencurigakan dan kemungkinan besar merupakan penipuan.';
      } else {
        threatType = 'penipuan umum';
        recommendations = [
          'Hindari berinteraksi dengan konten ini',
          'Jangan membuka tautan atau lampiran apa pun',
          'Blokir pengirim dan laporkan ke platform terkait'
        ];
        analysis = 'Teks ini menunjukkan beberapa indikator penipuan dan sebaiknya dihindari.';
      }
    } else {
      // English threat types and recommendations
      if (text.match(/\b(bank|account|credit\s*card)\b/i)) {
        threatType = 'financial phishing';
        recommendations = [
          'Do not provide any financial or personal information',
          'Verify directly with the official party through trusted channels',
          'Report this message to the authorities'
        ];
        analysis = 'This text contains suspicious requests for financial information and may be a phishing attempt.';
      } else if (text.match(/\b(prize|win|lottery)\b/i)) {
        threatType = 'prize scam';
        recommendations = [
          'Ignore this message - legitimate prizes do not ask for upfront fees',
          'Do not transfer money or provide personal information',
          'Report to the platform where you received this message'
        ];
        analysis = 'This text contains suspicious prize offers and is likely a scam.';
      } else {
        threatType = 'general scam';
        recommendations = [
          'Avoid interacting with this content',
          'Do not open any links or attachments',
          'Block the sender and report to the relevant platform'
        ];
        analysis = 'This text shows several indicators of fraud and should be avoided.';
      }
    }
  } else if (threatScore >= 20) {
    threatLevel = 'medium';
    confidence = Math.min(90, 60 + threatScore / 3);
    
    if (isIndonesian) {
      threatType = 'potensi penipuan';
      recommendations = [
        'Berhati-hatilah dengan konten ini',
        'Verifikasi keaslian informasi dari sumber resmi',
        'Jangan memberikan informasi pribadi atau keuangan'
      ];
      analysis = 'Teks ini menunjukkan beberapa indikator yang mencurigakan dan perlu diperiksa lebih lanjut.';
    } else {
      threatType = 'potential scam';
      recommendations = [
        'Be careful with this content',
        'Verify the authenticity of the information from official sources',
        'Do not provide personal or financial information'
      ];
      analysis = 'This text shows some suspicious indicators and should be further examined.';
    }
  } else {
    if (isIndonesian) {
      recommendations = [
        'Tetap berhati-hati dengan konten online',
        'Selalu verifikasi pengirim atau sumber informasi'
      ];
      analysis = 'Teks ini tidak menunjukkan indikator ancaman yang signifikan.';
    } else {
      recommendations = [
        'Stay cautious with online content',
        'Always verify the sender or source of information'
      ];
      analysis = 'This text does not show significant threat indicators.';
    }
  }
  
  return {
    threatLevel,
    confidence: Math.round(confidence),
    threatType,
    recommendations,
    analysis
  };
}

// Helper function to detect if text is likely Indonesian
function detectIndonesianLanguage(text: string): boolean {
  // Common Indonesian words that don't appear much in English
  const indonesianWords = [
    'yang', 'dengan', 'untuk', 'dari', 'dalam', 'tidak', 'dan', 'ini', 'itu', 
    'oleh', 'pada', 'akan', 'mereka', 'saya', 'kamu', 'kami', 'adalah', 'telah',
    'atau', 'jika', 'bisa', 'harus', 'sudah', 'juga', 'ada', 'tersebut'
  ];
  
  let indonesianWordCount = 0;
  const words = text.toLowerCase().split(/\s+/);
  
  for (const word of words) {
    if (indonesianWords.includes(word)) {
      indonesianWordCount++;
    }
  }
  
  // If more than 5% of words are uniquely Indonesian, consider it Indonesian
  return indonesianWordCount > 0 && (indonesianWordCount / words.length) > 0.05;
} 
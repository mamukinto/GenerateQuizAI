import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

const OPENAI_API_KEY = 'take from .env or just copy here idk'

const styles = {
  app: { minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '24px' },
  wrapper: { maxWidth: '768px', margin: '0 auto', backgroundColor: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  title: { fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', textAlign: 'center', color: '#1e3a8a' },
  textarea: { width: '100%', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '12px', outline: 'none', resize: 'vertical' },
  fileInput: { display: 'block', width: '100%', color: '#374151', marginTop: '8px' },
  buttonPrimary: { width: '100%', padding: '12px 0', backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', border: 'none', borderRadius: '12px', cursor: 'pointer' },
  buttonPrimaryDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  status: { fontSize: '14px', fontStyle: 'italic', color: '#6b7280', marginTop: '8px' },
  section: { marginTop: '32px' },
  summaryTitle: { fontSize: '20px', fontWeight: '600', marginBottom: '12px' },
  summaryBox: { backgroundColor: '#f9fafb', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #60a5fa', whiteSpace: 'pre-line', color: '#374151' },
  quizTitle: { fontSize: '20px', fontWeight: '600', marginBottom: '16px' },
  questionCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' },
  questionText: { fontSize: '16px', fontWeight: '500', color: '#1f2937' },
  optionLabel: { display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' },
  optionInput: { marginRight: '8px' },
  submitButton: { width: '100%', padding: '12px 0', backgroundColor: '#10b981', color: '#fff', fontWeight: '600', border: 'none', borderRadius: '12px', cursor: 'pointer' },
  resultBox: { backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '12px', marginTop: '24px', marginBottom: '24px', textAlign: 'center' },
  resultText: { fontSize: '18px', fontWeight: '600', color: '#166534' },
  correctAnswer: { color: '#16a34a', fontWeight: '500', marginTop: '8px' },
  wrongAnswer: { color: '#dc2626', fontWeight: '500', marginTop: '8px' },
  optionCorrect: { backgroundColor: '#dcfce7', borderRadius: '8px', padding: '4px 8px' },
  optionWrong: { backgroundColor: '#fee2e2', borderRadius: '8px', padding: '4px 8px' },
  optionNeutral: { backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '4px 8px' }
};

async function parsePDF(file, setStatus) {
  setStatus(`Parsing PDF: ${file.name}`);
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    setStatus(`Reading page ${i} of ${pdf.numPages}`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text;
}

async function parseDOCX(file, setStatus) {
  setStatus(`Extracting DOCX: ${file.name}`);
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function ocrImage(file, setStatus) {
  setStatus(`Performing OCR on image: ${file.name}`);
  const worker = createWorker({ logger: m => setStatus(m.status) });
  await worker.load(); await worker.loadLanguage('eng'); await worker.initialize('eng');
  const { data } = await worker.recognize(file);
  await worker.terminate();
  return data.text;
}

async function getTranscript(file, setStatus) {
  setStatus(`Transcribing audio/video: ${file.name}`);
  const form = new FormData(); form.append('file', file); form.append('model', 'whisper-1');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, body: form
  });
  const json = await res.json(); return json.text;
}

async function captureScreenshots(file, setStatus, intervalSec = 2) {
  setStatus(`Capturing video snapshots: ${file.name}`);
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video'); video.src = url; video.muted = true; video.play();
    video.addEventListener('loadedmetadata', () => {
      const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d'); const shots = []; let t = 0;
      const takeShot = () => {
        if (t <= video.duration) {
          setStatus(`Snapshot at ${Math.round(t)}s`);
          video.currentTime = t;
          video.addEventListener('seeked', () => {
            ctx.drawImage(video, 0, 0);
            shots.push(canvas.toDataURL()); t += intervalSec; takeShot();
          }, { once: true });
        } else { URL.revokeObjectURL(url); resolve(shots); }
      };
      takeShot();
    });
  });
}

export default function App() {
  const [textInput, setTextInput] = useState('');
  const [files, setFiles] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [summary, setSummary] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  const handleTextChange = e => setTextInput(e.target.value);
  const handleFileChange = e => setFiles(Array.from(e.target.files));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setStatus('Processing inputs...');
    try {
      // Collect text from manual input and files
      let texts = [];
      if (textInput.trim()) texts.push(textInput);
      for (const file of files) {
        if (file.type === 'application/pdf') texts.push(await parsePDF(file, setStatus));
        else if (file.name.endsWith('.docx')) texts.push(await parseDOCX(file, setStatus));
        else if (file.type.startsWith('image/')) texts.push(await ocrImage(file, setStatus));
        else if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
          texts.push(await getTranscript(file, setStatus));
          setScreenshots(await captureScreenshots(file, setStatus));
        }
      }

      setStatus('Requesting summary and quiz...');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a tutor. Respond ONLY with valid JSON matching this schema:
{
  "summary": string,
  "questions": [
    {
      "question": string,
      "options": [string],
      "answer": string
    }
  ]
}
Make sure to always respond with just plain text as json. NOT markdown.`
            },
            { role: 'user', content: texts.join('\n\n') }
          ],
          temperature: 0.7
        })
      });
      const { choices } = await res.json();
      const jsonResponse = choices[0].message.content;

      // Parse the JSON directly
      const parsed = JSON.parse(jsonResponse);
      setSummary(parsed.summary);
      setQuiz(parsed);
      // Reset states for new quiz generation
      setUserAnswers({});
      setQuizSubmitted(false);
      setScore(null);
      setStatus('Done!');

    } catch (err) {
      console.error('API or parse error:', err);
      alert('Could not retrieve or parse quiz. Check console.');
      setStatus('Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle answer selection
  const handleAnswerChange = (questionIndex, selectedOption) => {
    if (quizSubmitted) return; // Prevent changing answers after submission

    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedOption
    }));
  };

  // Submit and check answers
  const handleQuizSubmit = () => {
    if (!quiz || !quiz.questions.length) return;

    // Calculate score
    let correctCount = 0;
    quiz.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.answer) {
        correctCount++;
      }
    });

    const calculatedScore = Math.round((correctCount / quiz.questions.length) * 100);
    setScore(calculatedScore);
    setQuizSubmitted(true);
  };

  // Get appropriate style for options after submission
  const getOptionStyle = (questionIdx, option) => {
    if (!quizSubmitted) return {};

    const isUserAnswer = userAnswers[questionIdx] === option;
    const isCorrectAnswer = quiz.questions[questionIdx].answer === option;

    if (isCorrectAnswer) {
      return styles.optionCorrect;
    } else if (isUserAnswer && !isCorrectAnswer) {
      return styles.optionWrong;
    } else {
      return styles.optionNeutral;
    }
  };

  return (
      <div style={styles.app}>
        <div style={styles.wrapper}>
          <h1 style={styles.title}>Quiz Generator</h1>
          <form onSubmit={handleSubmit}>
          <textarea value={textInput} onChange={handleTextChange}
                    placeholder="Paste text here or upload files" style={styles.textarea} rows={4} />
            <input type="file" multiple accept=".pdf,.docx,image/*,video/*,audio/*"
                   onChange={handleFileChange} style={styles.fileInput} />
            <button type="submit" disabled={loading}
                    style={loading ? { ...styles.buttonPrimary, ...styles.buttonPrimaryDisabled } : styles.buttonPrimary}>
              {loading && <svg style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="20" height="20">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8v8z" />
              </svg>}
              {loading ? 'Processing...' : 'Generate Quiz'}
            </button>
            {status && <p style={styles.status}>{status}</p>}
          </form>

          {screenshots.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.quizTitle}>Video Snapshots</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                  {screenshots.map((src, i) => <img key={i} src={src} alt={`snapshot-${i}`} style={{ width: '100%', borderRadius: '8px' }} />)}
                </div>
              </div>
          )}

          {summary && (
              <div style={styles.section}>
                <h2 style={styles.summaryTitle}>Summary</h2>
                <div style={styles.summaryBox}><p>{summary}</p></div>
              </div>
          )}

          {quiz && (
              <div style={styles.section}>
                <h2 style={styles.quizTitle}>Quiz</h2>

                {quizSubmitted && score !== null && (
                    <div style={styles.resultBox}>
                      <p style={styles.resultText}>
                        Your Score: {score}% ({Object.values(userAnswers).filter((ans, idx) =>
                          ans === quiz.questions[idx].answer).length} out of {quiz.questions.length} correct)
                      </p>
                    </div>
                )}

                <div>
                  {quiz.questions.map((q, idx) => (
                      <div key={idx} style={styles.questionCard}>
                        <p style={styles.questionText}>{idx+1}. {q.question}</p>
                        {q.options?.map((opt, i) => (
                            <label key={i} style={styles.optionLabel}>
                              <input
                                  type="radio"
                                  name={`question-${idx}`}
                                  value={opt}
                                  checked={userAnswers[idx] === opt}
                                  onChange={() => handleAnswerChange(idx, opt)}
                                  disabled={quizSubmitted}
                                  style={styles.optionInput}
                              />
                              <span style={getOptionStyle(idx, opt)}>{opt}</span>
                            </label>
                        ))}
                        {quizSubmitted && (
                            <p style={userAnswers[idx] === q.answer ? styles.correctAnswer : styles.wrongAnswer}>
                              {userAnswers[idx] !== q.answer && (
                                  <>Correct answer: {q.answer}</>
                              )}
                              {userAnswers[idx] === q.answer && (
                                  <>Correct!</>
                              )}
                            </p>
                        )}
                      </div>
                  ))}
                  <button
                      type="button"
                      style={styles.submitButton}
                      onClick={handleQuizSubmit}
                      disabled={quizSubmitted || Object.keys(userAnswers).length !== (quiz?.questions?.length || 0)}
                  >
                    {quizSubmitted ? 'Quiz Submitted' : 'Submit Answers'}
                  </button>
                </div>
              </div>
          )}
        </div>
      </div>
  );
}
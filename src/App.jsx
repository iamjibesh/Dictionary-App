import React, { useState, useEffect } from 'react';
import { Search, Mic, Home, Bookmark, Clock, Volume2, VolumeX, Copy, X, Layers, Trash2, Info, ThumbsUp, ThumbsDown, AlertCircle, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Star, Moon, Sun, Book, Download } from 'lucide-react';
import { fetchWord } from './services/dictionaryApi';

const WORDS_OF_THE_DAY = ['serendipity', 'ephemeral', 'luminescent', 'mellifluous', 'eloquent', 'sonder', 'petrichor'];

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('home'); // home, search, saved, history, flashcards
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const [meaningTab, setMeaningTab] = useState('definition'); // definition, usage, synonyms
  
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setShowInstallPrompt(false);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('dictionary_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('dictionary_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('dictionary_theme', 'light');
    }
  }, [isDarkMode]);
  
  // Local storage state
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('dictionary_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [savedWords, setSavedWords] = useState(() => {
    const saved = localStorage.getItem('dictionary_saved_v2');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const recentSearches = history.slice(0, 5);
  const dayIndex = new Date().getDay();
  const wordOfTheDay = WORDS_OF_THE_DAY[dayIndex % WORDS_OF_THE_DAY.length];

  useEffect(() => {
    localStorage.setItem('dictionary_history', JSON.stringify(history));
  }, [history]);
  
  useEffect(() => {
    localStorage.setItem('dictionary_saved_v2', JSON.stringify(savedWords));
  }, [savedWords]);

  const handleSearch = async (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      searchForWord(searchTerm);
    }
  };

  const searchForWord = async (word) => {
    if (!word.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWord(word);
      setWordData(data[0]);
      setActiveTab('search');
      setMeaningTab('definition');
      
      setHistory(prev => {
        const filtered = prev.filter(w => w !== word.toLowerCase());
        return [word.toLowerCase(), ...filtered];
      });
      
    } catch (err) {
      setError("Word not found.");
      setWordData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }
    
    setIsListening(true);
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      searchForWord(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      alert("Microphone error. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const playAudio = (audioUrl) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    } else {
      alert("No audio pronunciation is available for this word.");
    }
  };

  const clearHistory = () => setHistory([]);
  const clearSaved = () => setSavedWords([]);

  const isWordSaved = (wordStr) => {
    if (!wordStr) return false;
    return savedWords.some(item => item.word === wordStr.toLowerCase());
  };

  const toggleSaveWord = async (wordStr) => {
    const wStr = wordStr.toLowerCase();
    
    const existsBefore = savedWords.some(item => item.word === wStr);
    if (existsBefore) {
       setSavedWords(prev => prev.filter(item => item.word !== wStr));
       return;
    }

    setSavedWords(prev => [{ word: wStr, definition: "Fetching definition..." }, ...prev]);

    if (wordData && wordData.word.toLowerCase() === wStr && wordData.meanings) {
       const defStr = wordData.meanings[0]?.definitions?.[0]?.definition || "Definition not available.";
       setSavedWords(prev => prev.map(item => item.word === wStr ? { ...item, definition: defStr } : item));
    } else {
       try {
          const data = await fetchWord(wStr);
          const defStr = data[0]?.meanings?.[0]?.definitions?.[0]?.definition || "Definition not available.";
          setSavedWords(prev => prev.map(item => item.word === wStr ? { ...item, definition: defStr } : item));
       } catch (e) {
          setSavedWords(prev => prev.map(item => item.word === wStr ? { ...item, definition: "Definition unavailable." } : item));
       }
    }
  };

  let phoneticText = '';
  let audioUrl = '';
  if (wordData) {
    if (wordData.phonetic) phoneticText = wordData.phonetic;
    else if (wordData.phonetics && wordData.phonetics.length > 0) {
      const p = wordData.phonetics.find(ph => ph.text);
      if (p) phoneticText = p.text;
      const a = wordData.phonetics.find(ph => ph.audio);
      if (a) audioUrl = a.audio;
    }
  }

  const isMobileWordView = wordData && activeTab === 'search';
  const isSavedWord = wordData ? isWordSaved(wordData.word) : false;

  const NavItems = () => (
    <>
      <button className={`flex flex-col items-center ${activeTab === 'home' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white'} transition-colors mb-0 lg:mb-10`} onClick={() => {setActiveTab('home'); setWordData(null); setSearchTerm('');}}>
        <Home className="w-6 h-6 mb-1 lg:w-7 lg:h-7" />
        <span className="text-[10px] lg:text-xs font-medium">Home</span>
      </button>
      <button className={`flex flex-col items-center ${activeTab === 'search' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white'} transition-colors mb-0 lg:mb-10`} onClick={() => setActiveTab('search')}>
        <Search className="w-6 h-6 mb-1 lg:w-7 lg:h-7" />
        <span className="text-[10px] lg:text-xs font-medium">Search</span>
      </button>
      <button className={`flex flex-col items-center ${activeTab === 'saved' || activeTab === 'flashcards' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white'} transition-colors mb-0 lg:mb-10`} onClick={() => setActiveTab('saved')}>
        <Star className="w-6 h-6 mb-1 lg:w-7 lg:h-7" />
        <span className="text-[10px] lg:text-xs font-medium">Saved</span>
      </button>
      <button className={`flex flex-col items-center ${activeTab === 'history' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white'} transition-colors mb-0 lg:mb-10`} onClick={() => setActiveTab('history')}>
        <Clock className="w-6 h-6 mb-1 lg:w-7 lg:h-7" />
        <span className="text-[10px] lg:text-xs font-medium">History</span>
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans flex w-full relative overflow-hidden transition-colors duration-300">

      {/* Desktop Sidebar Navigation */}
      <div className="hidden lg:flex flex-col items-center py-10 w-28 bg-gray-50 dark:bg-neutral-950 border-r border-gray-200 dark:border-neutral-900 z-20 shrink-0 shadow-sm h-screen relative transition-colors duration-300">
         <div className="mb-16 text-gray-800 dark:text-white">
           <Book className="w-8 h-8" />
         </div>
         <NavItems />
         
         <div className="absolute bottom-10">
           <button 
             onClick={() => setIsDarkMode(!isDarkMode)}
             className="p-3 rounded-full border border-gray-300 dark:border-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors"
           >
             {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
           </button>
         </div>
      </div>

      {/* Left Column (Master List) */}
      <div className={`w-full lg:w-[400px] xl:w-[450px] flex-col relative bg-gray-50 dark:bg-neutral-950 border-r border-gray-200 dark:border-neutral-900 z-10 shrink-0 h-screen overflow-y-auto pb-24 lg:pb-0 transition-colors duration-300 ${isMobileWordView || activeTab === 'flashcards' ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Top Header Section */}
        <div className="pt-12 pb-8 px-8 border-b border-gray-200 dark:border-neutral-900">
          <div className="flex justify-between items-center mb-8 lg:hidden">
            <div className="flex items-center text-gray-900 dark:text-white">
               <Book className="w-6 h-6 mr-3" />
               <h1 className="text-2xl font-bold tracking-wide font-serif">Dictionary</h1>
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-gray-900 dark:text-white">
               {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
          </div>
          
          <h1 className="hidden lg:block text-3xl font-bold tracking-wide mb-8 font-serif text-gray-900 dark:text-white">Dictionary</h1>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-neutral-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-14 pr-14 py-4 rounded-full bg-white dark:bg-neutral-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 border border-gray-200 dark:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-white/20 transition-all text-lg shadow-sm"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch}
            />
            <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
              <button 
                className={`${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-white'} transition-colors`} 
                onClick={handleVoiceSearch}
              >
                <Mic className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Left Column Content Area */}
        <div className="flex-1 px-6 pt-8 space-y-8">
          
          {loading && (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-2xl text-center font-medium border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          {!loading && activeTab === 'home' && (
            <>
              <section className="animate-fade-in">
                <div className="flex justify-between items-center mb-5 px-2">
                  <div className="flex items-center text-gray-500 dark:text-neutral-500 text-xs font-bold tracking-widest uppercase">
                    <Clock className="w-4 h-4 mr-2" />
                    Recent
                  </div>
                  <button className="text-xs text-gray-600 dark:text-white font-medium flex items-center hover:text-gray-900 dark:hover:text-neutral-300" onClick={() => setActiveTab('history')}>
                    View all <ArrowRight className="w-3 h-3 ml-1" />
                  </button>
                </div>

                <div className="space-y-1">
                  {recentSearches.length > 0 ? recentSearches.map((word) => (
                    <div key={word} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors group cursor-pointer" onClick={() => { setSearchTerm(word); searchForWord(word); }}>
                      <div className="flex items-center flex-1">
                        <h3 className="text-gray-900 dark:text-white font-medium text-lg capitalize font-serif">{word}</h3>
                      </div>
                      <button className={`${isWordSaved(word) ? 'text-yellow-400' : 'text-gray-400 dark:text-neutral-600 opacity-0 group-hover:opacity-100 hover:text-gray-700 dark:hover:text-white'} transition-all`} onClick={(e) => { e.stopPropagation(); toggleSaveWord(word); }}>
                        <Star className="w-5 h-5" fill={isWordSaved(word) ? "currentColor" : "none"} />
                      </button>
                    </div>
                  )) : (
                    <div className="p-4 text-center text-gray-500 dark:text-neutral-600 text-sm">No recent searches.</div>
                  )}
                </div>
              </section>

              <section className="animate-fade-in mt-10">
                 <div className="flex items-center text-gray-500 dark:text-neutral-500 text-xs font-bold tracking-widest uppercase mb-4 px-2">
                  <Star className="w-4 h-4 mr-2" />
                  Word of the Day
                </div>
                <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-all border border-gray-200 dark:border-neutral-800 shadow-sm dark:shadow-none" onClick={() => {setSearchTerm(wordOfTheDay); searchForWord(wordOfTheDay)}}>
                  <h2 className="text-4xl font-bold text-gray-900 dark:text-white capitalize font-serif mb-2">{wordOfTheDay}</h2>
                  <p className="text-gray-500 dark:text-neutral-400 text-sm leading-relaxed">
                    Click to discover the definition and usage of today's featured word.
                  </p>
                </div>
              </section>
            </>
          )}

          {!loading && activeTab === 'history' && (
            <section className="animate-fade-in">
              <div className="flex justify-between items-center mb-5 px-2">
                <div className="flex items-center text-gray-500 dark:text-neutral-500 text-xs font-bold tracking-widest uppercase">
                  <Clock className="w-4 h-4 mr-2" />
                  History
                </div>
                {history.length > 0 && (
                  <button className="text-xs text-gray-500 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors" onClick={clearHistory}>
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {history.length > 0 ? history.map((word, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer" onClick={() => { setSearchTerm(word); searchForWord(word); }}>
                    <h3 className="text-gray-900 dark:text-white font-medium text-lg capitalize font-serif">{word}</h3>
                  </div>
                )) : (
                  <div className="p-4 text-center text-gray-500 dark:text-neutral-600 text-sm">Your search history is empty.</div>
                )}
              </div>
            </section>
          )}

          {!loading && (activeTab === 'saved' || activeTab === 'flashcards') && (
            <section className="animate-fade-in">
              <div className="flex justify-between items-center mb-5 px-2">
                <div className="flex items-center text-gray-500 dark:text-neutral-500 text-xs font-bold tracking-widest uppercase">
                  <Star className="w-4 h-4 mr-2" />
                  Saved Words
                </div>
                {savedWords.length > 0 && (
                  <button className="text-xs text-gray-500 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 font-medium transition-colors" onClick={clearSaved}>
                    Clear All
                  </button>
                )}
              </div>

              {savedWords.length > 0 ? (
                <>
                  <button 
                    onClick={() => {setActiveTab('flashcards'); setFlashcardIndex(0); setIsFlipped(false);}}
                    className="w-full bg-gray-900 dark:bg-white text-white dark:text-black rounded-full py-4 mb-6 font-bold tracking-wide flex items-center justify-center hover:bg-gray-800 dark:hover:bg-neutral-200 transition-colors">
                    <Layers className="w-5 h-5 mr-2" />
                    Enter Flashcard Mode
                  </button>

                  <div className="space-y-1">
                    {savedWords.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors group">
                        <div className="flex flex-col cursor-pointer flex-1" onClick={() => { setSearchTerm(item.word); searchForWord(item.word); }}>
                          <h3 className="text-gray-900 dark:text-white font-medium text-xl capitalize font-serif mb-1">{item.word}</h3>
                          <p className="text-gray-500 dark:text-neutral-500 text-sm line-clamp-1">{item.definition}</p>
                        </div>
                        <button className="text-yellow-400 hover:text-gray-400 dark:hover:text-neutral-400 transition-colors ml-4 p-2" onClick={() => toggleSaveWord(item.word)}>
                          <Star className="w-5 h-5" fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-gray-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
                   <Star className="w-12 h-12 text-gray-300 dark:text-neutral-700 mx-auto mb-4" />
                   <p className="text-gray-900 dark:text-white font-medium">No saved words yet.</p>
                   <p className="text-gray-500 dark:text-neutral-500 text-sm mt-2">Search for a word and click the star to save it.</p>
                </div>
              )}
            </section>
          )}
          
        </div>
      </div>

      {/* Right Column (Word Details & Flashcards) */}
      <div className={`flex-1 flex-col relative h-screen bg-white dark:bg-black transition-colors duration-300 ${!isMobileWordView && activeTab !== 'flashcards' ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Flashcard View (Vibrant Colors) */}
        {activeTab === 'flashcards' && savedWords.length > 0 && (
           <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center animate-fade-in w-full h-full transition-colors duration-500 ${isFlipped ? 'bg-green-400' : 'bg-yellow-400'}`}>
              
              {/* Top info */}
              <div className="absolute top-12 left-0 right-0 px-8 flex justify-between items-center text-black/60 font-medium">
                 <span>{flashcardIndex + 1} / {savedWords.length}</span>
                 <button onClick={() => {setActiveTab('saved'); setIsFlipped(false);}} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X className="w-6 h-6"/></button>
              </div>

              <div 
                className="w-full flex-1 flex flex-col items-center justify-center p-12 cursor-pointer text-black"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                 {!isFlipped ? (
                   // Front
                   <div className="text-center animate-fade-in">
                      <p className="text-black/50 font-bold tracking-widest uppercase mb-4 text-sm">Word</p>
                      <h3 className="text-6xl md:text-8xl font-bold capitalize font-serif tracking-tight">{savedWords[flashcardIndex]?.word}</h3>
                   </div>
                 ) : (
                   // Back
                   <div className="text-center animate-fade-in max-w-2xl">
                      <p className="text-black/50 font-bold tracking-widest uppercase mb-6 text-sm">Definition</p>
                      <h3 className="text-3xl md:text-5xl font-medium leading-tight">{savedWords[flashcardIndex]?.definition}</h3>
                   </div>
                 )}
              </div>
              
              {/* Bottom Actions */}
              <div className="absolute bottom-12 left-0 right-0 px-8 flex flex-col items-center pointer-events-none">
                 
                 {!isFlipped && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                     className="px-8 py-3 rounded-full border border-black/20 text-black font-medium text-lg hover:bg-black/5 transition-colors flex items-center backdrop-blur-sm pointer-events-auto"
                   >
                     flip <ArrowRight className="w-5 h-5 ml-2" />
                   </button>
                 )}

                 {/* Navigation Arrows (Always visible at the bottom) */}
                 <div className="flex justify-between w-full max-w-sm mt-6 pointer-events-auto">
                    <button 
                      onClick={(e) => { 
                         e.stopPropagation(); 
                         setFlashcardIndex(prev => Math.max(0, prev - 1)); 
                         setIsFlipped(false); 
                      }}
                      disabled={flashcardIndex === 0}
                      className="p-4 rounded-full bg-black/5 hover:bg-black/10 text-black disabled:opacity-20 transition-colors"
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button 
                      onClick={(e) => { 
                         e.stopPropagation(); 
                         setFlashcardIndex(prev => Math.min(savedWords.length - 1, prev + 1)); 
                         setIsFlipped(false); 
                      }}
                      disabled={flashcardIndex === savedWords.length - 1}
                      className="p-4 rounded-full bg-black/5 hover:bg-black/10 text-black disabled:opacity-20 transition-colors"
                    >
                      <ChevronRight className="w-8 h-8" />
                    </button>
                 </div>
              </div>
           </div>
        )}

        {/* Empty State */}
        {!wordData && activeTab !== 'flashcards' && (
          <div className="hidden lg:flex h-full flex-col items-center justify-center text-gray-400 dark:text-neutral-600 space-y-6">
            <Search className="w-16 h-16 opacity-20" />
            <p className="text-lg font-medium tracking-wide">Search for a word to begin</p>
          </div>
        )}

        {/* Word Details (Dark/Light Mode Base) */}
        {!loading && wordData && activeTab !== 'flashcards' && (
          <div className="flex flex-col h-full bg-white dark:bg-black relative transition-colors duration-300">
            
            {/* Top Left Back Button (Mobile) */}
            <div className="lg:hidden absolute top-6 left-6 z-20">
               <button 
                 onClick={() => {setWordData(null); setActiveTab('home');}}
                 className="p-3 rounded-full bg-gray-100/80 dark:bg-neutral-900/80 backdrop-blur text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-neutral-800 transition-colors"
               >
                 <ArrowLeft className="w-6 h-6" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 lg:px-20 pt-24 lg:pt-24 pb-40">
               {/* Word Header */}
               <div className="mb-12">
                  <p className="text-gray-500 dark:text-neutral-500 font-medium tracking-widest uppercase text-xs mb-3">
                    {wordData?.meanings?.[0]?.partOfSpeech || 'Word'}
                  </p>
                  <h2 className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold text-gray-900 dark:text-white capitalize font-serif tracking-tight leading-none mb-6">
                    {wordData.word}
                  </h2>
                  <div className="flex items-center text-gray-500 dark:text-neutral-400 text-lg md:text-xl">
                    <button onClick={() => playAudio(audioUrl)} className="mr-3 hover:text-gray-900 dark:hover:text-white transition-colors">
                      {audioUrl ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6 opacity-50" />}
                    </button>
                    <span className="font-serif italic tracking-wide">{phoneticText}</span>
                  </div>
               </div>

               {/* Meaning Tabs */}
               <div className="flex flex-wrap gap-3 mb-10 border-b border-gray-100 dark:border-neutral-900 pb-8">
                  {['definition', 'usage', 'synonyms'].map(tab => {
                     // Safe array access to prevent crashes
                     const meanings = wordData.meanings || [];
                     let hasData = true;
                     if (tab === 'usage' && !meanings.some(m => (m.definitions || []).some(d => d.example))) hasData = false;
                     if (tab === 'synonyms' && !meanings.some(m => m.synonyms && m.synonyms.length > 0)) hasData = false;
                     
                     if (!hasData) return null;

                     return (
                       <button 
                         key={tab}
                         onClick={() => setMeaningTab(tab)}
                         className={`px-6 py-2.5 rounded-full border transition-colors text-sm font-medium capitalize ${
                           meaningTab === tab 
                             ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-gray-900 dark:border-white' 
                             : 'bg-transparent text-gray-500 dark:text-neutral-400 border-gray-200 dark:border-neutral-700 hover:border-gray-400 dark:hover:border-neutral-500 hover:text-gray-900 dark:hover:text-white'
                         }`}
                       >
                         {tab}
                       </button>
                     );
                  })}
               </div>

               {/* Tab Content */}
               <div className="space-y-8 animate-fade-in">
                 {(wordData.meanings || []).map((meaning, mIdx) => (
                    <div key={mIdx}>
                       {meaningTab === 'definition' && (
                          <ul className="space-y-6">
                            {(meaning.definitions || []).map((def, dIdx) => (
                              <li key={dIdx} className="flex items-start text-gray-800 dark:text-white/90">
                                <span className="mr-4 text-gray-400 dark:text-neutral-600 font-medium">•</span>
                                <span className="text-xl md:text-2xl leading-relaxed">{def.definition}</span>
                              </li>
                            ))}
                          </ul>
                       )}
                       
                       {meaningTab === 'usage' && (meaning.definitions || []).filter(d => d.example).length > 0 && (
                          <div className="mb-8">
                            <p className="text-gray-500 dark:text-neutral-500 text-sm uppercase tracking-widest font-bold mb-4">{meaning.partOfSpeech}</p>
                            <ul className="space-y-6">
                              {(meaning.definitions || []).filter(d => d.example).map((def, dIdx) => (
                                <li key={dIdx} className="text-gray-700 dark:text-white/80 text-xl md:text-2xl leading-relaxed italic border-l-2 border-gray-200 dark:border-neutral-800 pl-6">
                                  "{def.example}"
                                </li>
                              ))}
                            </ul>
                          </div>
                       )}

                       {meaningTab === 'synonyms' && meaning.synonyms && meaning.synonyms.length > 0 && (
                          <div className="mb-8">
                            <p className="text-gray-500 dark:text-neutral-500 text-sm uppercase tracking-widest font-bold mb-4">{meaning.partOfSpeech}</p>
                            <div className="flex flex-wrap gap-3">
                               {meaning.synonyms.map(syn => (
                                  <span key={syn} onClick={() => {setSearchTerm(syn); searchForWord(syn)}} className="px-5 py-3 rounded-full border border-gray-200 dark:border-neutral-800 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-neutral-900 cursor-pointer transition-colors text-lg shadow-sm dark:shadow-none">
                                     {syn}
                                  </span>
                               ))}
                            </div>
                          </div>
                       )}
                    </div>
                 ))}
               </div>
            </div>

            {/* Floating Bottom Action Bar */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center px-6 pointer-events-none">
               <div className="bg-white/90 dark:bg-neutral-900/80 backdrop-blur-md p-2 rounded-full border border-gray-200 dark:border-neutral-800 flex items-center space-x-2 pointer-events-auto shadow-2xl">
                  {/* Save Button */}
                  <button 
                    onClick={() => toggleSaveWord(wordData.word)} 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all"
                  >
                    <Star className="w-5 h-5" fill={isSavedWord ? "currentColor" : "none"} color={isSavedWord ? "#FBBF24" : "currentColor"} />
                  </button>
                  
                  <div className="w-px h-8 bg-gray-200 dark:bg-neutral-800 mx-1"></div>

                  <button 
                    onClick={() => {
                       if (!isSavedWord) toggleSaveWord(wordData.word);
                       setActiveTab('flashcards'); 
                       setFlashcardIndex(savedWords.findIndex(w => w.word === wordData.word.toLowerCase()) !== -1 ? savedWords.findIndex(w => w.word === wordData.word.toLowerCase()) : 0); 
                       setIsFlipped(false);
                    }}
                    className="px-6 h-12 rounded-full flex items-center justify-center text-gray-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all"
                  >
                    <Layers className="w-5 h-5 mr-3" />
                    <span className="text-sm font-medium tracking-wide">flash card mode</span>
                  </button>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile/Tablet Bottom Navigation (Only visible when not showing a word or flashcard) */}
      {!isMobileWordView && activeTab !== 'flashcards' && (
        <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-950 border-t border-gray-200 dark:border-neutral-900 px-6 py-4 flex justify-between items-center z-30 transition-colors duration-300">
           <NavItems />
        </div>
      )}

      {/* PWA Install Prompt Banner */}
      {showInstallPrompt && (
        <div className="fixed bottom-24 lg:bottom-10 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-2xl rounded-3xl p-4 flex items-center space-x-4 w-[90%] max-w-sm animate-fade-in transition-colors">
           <div className="bg-gray-100 dark:bg-neutral-800 p-3 rounded-full text-gray-900 dark:text-white shadow-sm">
              <Download className="w-6 h-6" />
           </div>
           <div className="flex-1">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm font-serif tracking-wide">Install Dictionary</h4>
              <p className="text-xs text-gray-500 dark:text-neutral-400">Get quick offline access.</p>
           </div>
           <button onClick={handleInstallClick} className="bg-gray-900 dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 dark:hover:bg-neutral-200 transition-colors shadow-sm">
              Install
           </button>
           <button onClick={() => setShowInstallPrompt(false)} className="text-gray-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white p-2 ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
              <X className="w-5 h-5" />
           </button>
        </div>
      )}

    </div>
  );
}

export default App;

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mic, Save, FileDown, Trash2, Menu, Plus, Wand2, Play, StopCircle, Copy } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Speech {
  id: string;
  title: string;
  content: string;
}

interface VoiceNote {
  id: string;
  text: string;
}

const DEEPGRAM_API_KEY = 'd856bf7a704410beb4d048d05f9426f7d9361eae';

const App: React.FC = () => {
  const [speeches, setSpeeches] = useState<Speech[]>([
    { id: '1', title: 'Welcome Speech', content: 'Welcome to our event...' },
    { id: '2', title: 'Project Pitch', content: 'Our project aims to...' },
  ]);
  const [currentSpeech, setCurrentSpeech] = useState<Speech | null>(speeches[0]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [activeTab, setActiveTab] = useState('write');
  const { toast } = useToast();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const handleCopyVoiceNote = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Voice note text has been copied.",
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Copy failed",
        description: "Unable to copy text to clipboard.",
        variant: "destructive",
      });
    });
  };

  const handleDeleteVoiceNote = (id: string) => {
    setVoiceNotes(prevNotes => prevNotes.filter(note => note.id !== id));
    toast({
      title: "Voice note deleted",
      description: "The voice note has been removed.",
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      socketRef.current = new WebSocket('wss://api.deepgram.com/v1/listen', [
        'token',
        DEEPGRAM_API_KEY,
      ]);

      socketRef.current.onopen = () => {
        console.log('WebSocket connection established');
        mediaRecorderRef.current!.start(250);
      };

      socketRef.current.onmessage = (event) => {
        const result = JSON.parse(event.data);
        const transcript = result.channel.alternatives[0].transcript;
        if (transcript) {
          setCurrentTranscription((prev) => prev + ' ' + transcript);
        }
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Transcription error",
          description: "An error occurred during transcription.",
          variant: "destructive",
        });
      };

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(event.data);
        }
      };

      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      toast({
        title: "Recording failed",
        description: "Unable to start recording. Please check your microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
    setIsRecording(false);

    if (currentTranscription.trim()) {
      const newVoiceNote: VoiceNote = {
        id: Date.now().toString(),
        text: currentTranscription.trim(),
      };
      setVoiceNotes(prevNotes => [...prevNotes, newVoiceNote]);
      toast({
        title: "Voice note saved",
        description: "Your voice note has been added to the list.",
      });
    }

    setCurrentTranscription('');
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const renderBottomButtons = () => (
    <div className="flex justify-between mt-4">
      <Button variant="outline"><Save className="mr-2 h-4 w-4" />Save</Button>
      <Button variant="outline"><Wand2 className="mr-2 h-4 w-4" />AI Cleanup</Button>
      <Button
        variant={isRecording ? "destructive" : "default"}
        onClick={handleRecordToggle}
      >
        {isRecording ? <StopCircle className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
        {isRecording ? 'Stop' : 'Record'}
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Speech Writer Pro</h1>
        <Input
          value={currentSpeech?.title || ''}
          onChange={(e) => setCurrentSpeech(prev => prev ? { ...prev, title: e.target.value } : null)}
          className="max-w-xs"
          placeholder="Speech Title"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="voice">Voice Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="write">
          <ScrollArea className="h-[400px] w-full border rounded-md p-4">
            <Textarea
              value={currentSpeech?.content || ''}
              onChange={(e) => setCurrentSpeech(prev => prev ? { ...prev, content: e.target.value } : null)}
              placeholder="Start writing your speech here..."
              className="w-full min-h-[350px] border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </ScrollArea>
          {renderBottomButtons()}
        </TabsContent>
        <TabsContent value="voice">
          <ScrollArea className="h-[400px] w-full border rounded-md p-4">
            <div className="space-y-4">
              {isRecording && (
                <div className="bg-secondary p-4 rounded">
                  <h3 className="font-bold mb-2">Current Transcription:</h3>
                  <p>{currentTranscription || "Listening..."}</p>
                </div>
              )}
              <ul className="space-y-2">
                {voiceNotes.map((note) => (
                  <li key={note.id} className="flex items-center justify-between p-2 bg-secondary rounded">
                    <span className="flex-grow mr-2 overflow-hidden text-ellipsis">{note.text}</span>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleCopyVoiceNote(note.text)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteVoiceNote(note.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollArea>
          {renderBottomButtons()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default App;
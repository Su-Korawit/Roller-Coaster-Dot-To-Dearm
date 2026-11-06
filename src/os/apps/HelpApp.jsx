import VoiceSecretaryPanel from '../../components/voice/VoiceSecretaryPanel'

// "พี่ช่วยเหลือ": the existing AI secretary (พี่ใจดี), shown inside an OS window.
export default function HelpApp() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <VoiceSecretaryPanel />
    </div>
  )
}

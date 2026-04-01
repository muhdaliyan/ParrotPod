import { Puzzle } from 'lucide-react';

export default function Integrations() {
  return (
    <div className="pt-32 px-8 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Telegram app', 'Whatsapp'].map((name) => (
          <div key={name} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
              <Puzzle size={24} />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">{name}</h3>
            <p className="text-sm text-on-surface-variant mb-4">Connect your {name} account to sync data.</p>
            <button className="w-full py-2 bg-primary text-on-primary rounded-lg font-bold">Connect</button>
          </div>
        ))}
      </div>
    </div>
  );
}

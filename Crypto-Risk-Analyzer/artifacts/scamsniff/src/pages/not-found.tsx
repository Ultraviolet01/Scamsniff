import { Link } from "wouter";
import { Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="text-center max-w-md p-8 bg-card/50 border border-border rounded-2xl shadow-2xl backdrop-blur-sm">
        <div className="flex justify-center mb-6">
          <Terminal className="w-16 h-16 text-primary opacity-80" />
        </div>
        <h1 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-4">
          404 // NOT FOUND
        </h1>
        <p className="text-muted-foreground font-mono text-sm mb-8">
          The node you are trying to access does not exist on this network.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg font-mono text-sm transition-colors uppercase tracking-widest"
        >
          Return to Hub
        </Link>
      </div>
    </div>
  );
}

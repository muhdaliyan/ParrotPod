import React, { useState } from 'react';
import { Terminal, Cpu, CheckCircle2, Copy, ExternalLink, ShieldCheck, Zap, Info, Check } from 'lucide-react';

interface McpGuideProps {
    theme: 'light' | 'dark';
}

const McpGuide = ({ theme }: McpGuideProps) => {
    const isDark = theme === 'dark';
    const [copied, setCopied] = useState(false);

    const mcpConfig = {
        "mcpServers": {
            "parrotpod-mcp": {
                "command": "npx",
                "args": [
                    "-y",
                    "github:muhdaliyan/parrotpod-mcp"
                ]
            }
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(mcpConfig, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-12">
                <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest mb-3">
                    <span className="w-8 h-px bg-primary/30"></span>
                    Advanced Integration
                </div>
                <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 rounded-2xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7] shadow-sm'} border`}>
                        <img src="/mcp.svg" alt="MCP" className="w-10 h-10 object-contain" />
                    </div>
                    <h1 className={`text-4xl md:text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-[#18181B]'}`}>
                        MCP Searcher Setup
                    </h1>
                </div>
                <p className={`text-xl ${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} leading-relaxed max-w-2xl`}>
                    Connect ParrotPod to your AI agents via Model Context Protocol (MCP). 
                    Enable Claude or Antigravity to search and read your documentation instantly.
                </p>
            </header>

            <section className="space-y-8">
                <div className="flex items-center gap-3">
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#18181B]'}`}>1. Claude Desktop Integration</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-tighter">Recommended</span>
                </div>
                
                <div className={`p-8 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7] shadow-sm'} border relative overflow-hidden group`}>
                    <div className="space-y-6 relative z-10">
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-primary font-bold text-sm">1</span>
                            </div>
                            <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} text-sm leading-relaxed`}>
                                Open <strong>Claude Desktop</strong> and click your profile icon to go to <strong>Settings</strong>.
                            </p>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-primary font-bold text-sm">2</span>
                            </div>
                            <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} text-sm leading-relaxed`}>
                                Navigate to the <strong>Developer</strong> tab in the sidebar.
                            </p>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-primary font-bold text-sm">3</span>
                            </div>
                            <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} text-sm leading-relaxed`}>
                                Click <strong>'Edit Config'</strong> to open your <code>claude_desktop_config.json</code> file.
                            </p>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-primary font-bold text-sm">4</span>
                            </div>
                            <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} text-sm leading-relaxed`}>
                                Paste the JSON configuration block (provided below) into the <code>mcpServers</code> section of the file.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-8 mt-12">
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#18181B]'} mb-4`}>2. Antigravity IDE Integration</h2>
                <div className={`p-8 rounded-3xl ${isDark ? 'bg-[#18181B] border-[#27272A]' : 'bg-white border-[#E4E4E7] shadow-sm'} border relative overflow-hidden group`}>
                    <div className="space-y-6 relative z-10">
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-primary font-bold text-sm">1</span>
                            </div>
                            <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} text-sm leading-relaxed`}>
                                Click the <strong>three-dot menu</strong> in the agent panel on the right sidebar.
                            </p>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-primary font-bold text-sm">2</span>
                            </div>
                            <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} text-sm leading-relaxed`}>
                                Select <strong>'MCP servers'</strong> from the dropdown menu.
                            </p>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-primary font-bold text-sm">3</span>
                            </div>
                            <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} text-sm leading-relaxed`}>
                                Choose <strong>'Manage MCP Servers'</strong> to edit your <code>mcp_config.json</code> file.
                            </p>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-primary font-bold text-sm">4</span>
                            </div>
                            <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} text-sm leading-relaxed`}>
                                Paste the JSON configuration block (provided below) into the file and save.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-6 mt-12">
                <div className="flex justify-between items-end">
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#18181B]'}`}>Installation Snippet</h2>
                    <button 
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all
                            ${copied ? 'bg-green-600 text-white' : isDark ? 'bg-[#27272A] text-white hover:bg-[#3F3F46]' : 'bg-[#F4F4F5] text-[#18181B] hover:bg-[#E4E4E7]'}`}
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} className="text-primary" />}
                        {copied ? 'Copied' : 'Copy JSON'}
                    </button>
                </div>
                
                <div className={`rounded-2xl ${isDark ? 'bg-[#09090B] border-[#27272A]' : 'bg-[#18181B] border-[#27272A]'} border overflow-hidden shadow-2xl transition-all duration-300`}>
                    <div className="px-4 py-2 bg-[#18181B] border-b border-[#27272A] flex items-center justify-between">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]"></div>
                        </div>
                        <span className="text-[10px] font-mono text-[#52525B]">mcp_config.json</span>
                    </div>
                    <pre className="p-6 overflow-x-auto text-xs font-mono leading-relaxed selection:bg-primary/40 text-white">
                        {JSON.stringify(mcpConfig, null, 2)}
                    </pre>
                </div>

                <div className={`flex items-center gap-3 p-4 rounded-xl ${isDark ? 'bg-primary/5 text-primary/80' : 'bg-primary/5 text-primary'} border border-primary/10 text-[10px] leading-relaxed`}>
                    <Info size={14} className="flex-shrink-0" />
                    This command uses <strong>npx</strong> to automatically download and run the latest version of the ParrotPod MCP server directly from GitHub.
                </div>
            </section>

            <section className={`mt-16 p-8 rounded-3xl ${isDark ? 'bg-gradient-to-r from-primary/10 to-transparent border-primary/10' : 'bg-gradient-to-r from-primary/5 to-transparent border-primary/20'} border`}>
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-1">
                        <h3 className={`text-xl font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-[#18181B]'}`}>
                            <Zap size={24} className="text-primary" />
                            Ready for autonomous docs?
                        </h3>
                        <p className={`${isDark ? 'text-[#A1A1AA]' : 'text-[#52525B]'} text-sm leading-relaxed mb-6`}>
                            Once connected, your AI agents will have full access to search and retrieve documentation sections. 
                            Ask Claude things like: <br />
                            <span className="italic font-medium text-primary mt-2 block">"Search ParrotPod docs for how to buy phone numbers."</span>
                        </p>
                        <ul className="grid grid-cols-2 gap-y-2 gap-x-4">
                            {['Zero config npx install', 'Standard MCP protocol', 'Claude Desktop ready', 'Antigravity optimized'].map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-[10px] font-bold text-primary">
                                    <CheckCircle2 size={12} /> {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default McpGuide;

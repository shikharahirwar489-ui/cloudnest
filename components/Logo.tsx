import Link from 'next/link';import {Cloud, Layers2} from 'lucide-react';
export function Logo(){return <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight"><span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-brand"><Cloud size={22}/><Layers2 size={10} className="absolute bottom-1"/></span><span>cloudnest</span></Link>}

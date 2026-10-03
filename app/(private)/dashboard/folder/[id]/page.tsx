import {Dashboard} from '@/components/Dashboard';export default async function Page({params}:{params:Promise<{id:string}>|{id:string}}){const {id}=await params;return <Dashboard folderId={id}/>}

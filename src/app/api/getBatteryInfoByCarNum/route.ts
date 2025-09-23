import { NextResponse } from "next/server"

export const POST = async function (req: Request) {
    if(req.method==="OPTIONS") {
        return NextResponse.next()
    }
    const { cardNum } = await req.json()

    const response = await fetch(`https://zlzx.zjamr.zj.gov.cn/pzcode/vin/${cardNum}`, {
        redirect: 'follow'
    })
    
    const text = await response.text();

    return NextResponse.json({ text, url: `https://zlzx.zjamr.zj.gov.cn/pzcode/vin/${cardNum}` }, { status: 200 })
}
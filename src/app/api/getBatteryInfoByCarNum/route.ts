import { NextResponse } from "next/server"

export const POST = async function (req: Request) {
    const { cardNum } = await req.json()

    const response = await fetch(`https://www.pzcode.cn/vin/${cardNum}`, {
        redirect: 'follow'
    })
    
    const text = await response.text();

    return NextResponse.json({ text, url: `https://www.pzcode.cn/pwb/${cardNum}` }, { status: 200 })
}
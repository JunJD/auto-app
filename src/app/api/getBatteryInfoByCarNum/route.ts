import { NextResponse } from "next/server"

export const maxDuration = 60

export const POST = async function (req: Request) {
    try {

        if (req.method === "OPTIONS") {
            return NextResponse.next()
        }
        const { cardNum } = await req.json()

        const response = await fetch(`https://zlzx.zjamr.zj.gov.cn/pzcode/vin/${cardNum}`, {
            redirect: 'follow'
        })

        const text = await response.text();

        return NextResponse.json({ text, url: `https://zlzx.zjamr.zj.gov.cn/pzcode/vin/${cardNum}` }, { status: 200 })
    } catch (error) {
        return NextResponse.json({ text: ''}, { status: 200 })

    }
}
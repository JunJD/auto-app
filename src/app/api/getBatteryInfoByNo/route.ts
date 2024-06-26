import { NextResponse } from "next/server"

export const maxDuration = 25

export const POST = async function (req: Request) {
    try {

        if (req.method === "OPTIONS") {
            return NextResponse.next()
        }
        const { batteryNo } = await req.json()

        const response = await fetch(`https://www.pzcode.cn/pwb/${batteryNo}`, {
            redirect: 'follow',
            // 超时时间
        })

        const text = await response.text();
        const 销售单位未入库 = text.includes('销售单位未入库')
        const 车辆制造商 = text.includes('车辆制造商')

        console.table({ 销售单位未入库, 车辆制造商 });

        return NextResponse.json({ code: 销售单位未入库 && !车辆制造商 ? 0 : 1, url: `https://www.pzcode.cn/pwb/${batteryNo}` }, { status: 200 })
    } catch (error) {
        return NextResponse.json({ code: 1 }, { status: 200 })
    }
}
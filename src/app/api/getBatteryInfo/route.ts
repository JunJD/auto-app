import { NextResponse } from "next/server"

export const maxDuration = 60

export const POST = async function (req: Request) {
    if (req.method === "OPTIONS") {
        return NextResponse.next()
    }
    const { token, dcbh } = await req.json()
    const response = await fetch(`
    https://jgjfjdcgl.gat.zj.gov.cn:5102/inf_zpm/hz_mysql_api/BatteryBinding/dcinfoquery?token=${token}&dcbhurl=https://www.pzcode.cn/pwb/${dcbh}
    `, {
        method: "GET",
        headers: {
            authority: 'jgjfjdcgl.gat.zj.gov.cn:5102',
            scheme: 'https',
            'accept-encoding': 'gzip',
            'user-agent': "okhttp/4.9.3"
        }
    })
    const data = await response.json()

    if (data.code === 0) {
        const response2 = await fetch(`https://www.pzcode.cn/pwb/${dcbh}`, {
            redirect: 'follow',
            // 超时时间
        })
        const text = await response2.text();
        const 销售单位未入库 = text.includes('销售单位未入库')

        if (销售单位未入库) {
            return NextResponse.json({
                ...data, code: 6, url: `
            https://jgjfjdcgl.gat.zj.gov.cn:5102/inf_zpm/hz_mysql_api/BatteryBinding/dcinfoquery?token=${token}&dcbhurl=https://www.pzcode.cn/pwb/${dcbh}`
            }, { status: 200 })
        }
    }
    return NextResponse.json({
        ...data, url: `
    https://jgjfjdcgl.gat.zj.gov.cn:5102/inf_zpm/hz_mysql_api/BatteryBinding/dcinfoquery?token=${token}&dcbhurl=https://www.pzcode.cn/pwb/${dcbh}`
    }, { status: 200 })
}
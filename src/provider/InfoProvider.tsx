"use client"

import appStorage from "@/utils/appStorage";
import { Dispatch, SetStateAction, createContext, useEffect, useRef, useState } from "react"

interface ListItem {
    value: string,
    status: string,
    battery_model?: string, //电池型号
    battery_type?: string, // 电池类型
    bfn_or_oe?: string, // 电池品牌
    brand?: string //中文品牌

    // battery_num
    battery_num?: string, // 电池编号
}

export const InfoContext = createContext<
    {
        cardInfoList: Array<ListItem>,
        setCardInfoList: Dispatch<SetStateAction<ListItem[]>>
    }
>({
    cardInfoList: [],
    setCardInfoList: () => { }
})

export default function InfoProvider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [cardInfoList, setCardInfoList] = useState<Array<ListItem>>([])
    const firstRef = useRef(true)
    useEffect(() => {
        if(firstRef.current) {
            const list = appStorage.getItem("cardInfoList")
            if(list) {
                setCardInfoList(JSON.parse(list))
            }
        }

        return () => {
            firstRef.current = false
        }
    }, [])
    
    const _setCardInfoList: Dispatch<SetStateAction<ListItem[]>> = (payload) => {
        if(typeof payload === 'function') {
            setCardInfoList(prev=>{
                const list = payload(prev)
                appStorage.setItem("cardInfoList", JSON.stringify(list))
                return list
            })
        } else {
            const list = payload
            appStorage.setItem("cardInfoList", JSON.stringify(list))
            setCardInfoList(list)
        }
    }

    return (
        <InfoContext.Provider value={{ cardInfoList, setCardInfoList: _setCardInfoList }}>
            {children}
        </InfoContext.Provider>
    )
}
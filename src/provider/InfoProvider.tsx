"use client"

import appStorage from "@/utils/appStorage";
import { Dispatch, SetStateAction, createContext, useEffect, useRef, useState } from "react"

export interface CarListItem {
    value: string,
    status: string,
    battery_model?: string, //电池型号
    battery_type?: string, // 电池类型
    bfn_or_oe?: string, // 电池品牌
    brand?: string //中文品牌
    batteryCapacity?: string, // 电池容量
    
    // battery_num
    battery_num?: string, // 电池编号
}

export interface BatteryListItem {
    value: string, // qydcbm
    status: string,
    battery_model?: string, //电池型号 dcxh
    battery_type?: string, // 电池类型 dclx
    bfn_or_oe?: string, // 电池品牌 // dcpp
    // dcrl 电池容量
    batteryCapacity?: string
}

export const InfoContext = createContext<
    {
        cardInfoList: Array<CarListItem>,
        setCardInfoList: Dispatch<SetStateAction<CarListItem[]>>,

        batteryList: Array<BatteryListItem>,
        setBatteryListItem: Dispatch<SetStateAction<BatteryListItem[]>>,
    }
>({
    cardInfoList: [],
    batteryList: [],
    setCardInfoList: () => { },
    setBatteryListItem: () => { }
})

export default function InfoProvider({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const [cardInfoList, setCardInfoList] = useState<Array<CarListItem>>([])
    const [batteryList, setBatteryListItem] = useState<Array<BatteryListItem>>([])
    const firstRef = useRef(true)
    useEffect(() => {
        if (firstRef.current) {
            const list = appStorage.getItem("cardInfoList")
            const batteryList = appStorage.getItem("batteryListItem")
            if (list) {
                setCardInfoList(JSON.parse(list))
            }
            if (batteryList) {
                setBatteryListItem(JSON.parse(batteryList))
            }
        }

        return () => {
            firstRef.current = false
        }
    }, [])

    const _setCardInfoList: Dispatch<SetStateAction<CarListItem[]>> = (payload) => {
        if (typeof payload === 'function') {
            setCardInfoList(prev => {
                const _list = payload(prev)
                // 去重复
                const list = _list.filter((item, index, arr) => {
                    return arr.findIndex(t => t.value === item.value) === index
                })
                appStorage.setItem("cardInfoList", JSON.stringify(list))
                return list
            })
        } else {
            const _list = payload
            // 去重复
            const list = _list.filter((item, index, arr) => {
                return arr.findIndex(t => t.value === item.value) === index
            })
            appStorage.setItem("cardInfoList", JSON.stringify(list))
            setCardInfoList(list)
        }
    }
    
    function clearRedundantData (list: Array<BatteryListItem>) {
        const _list = list.filter((it,idx)=>{
            return (idx < 100 || it.status === 'success')
        })
        appStorage.setItem("batteryListItem", JSON.stringify(_list))
        list.length = 0
        return _list
    }

    const _setBatteryListItem: Dispatch<SetStateAction<BatteryListItem[]>> = (payload) => {
        if (typeof payload === 'function') {
            setBatteryListItem(prev => {
                const _list = payload(prev)
                if(_list.length > 10000) {
                    return clearRedundantData(_list)
                }
                return _list
            })

        } else {
            let _list = payload
            if(_list.length > 10000) {
                _list = clearRedundantData(_list)
            }
            setBatteryListItem(_list)
        }
    }

    return (
        <InfoContext.Provider value={{ cardInfoList, setCardInfoList: _setCardInfoList, batteryList, setBatteryListItem: _setBatteryListItem }}>
            {children}
        </InfoContext.Provider>
    )
}
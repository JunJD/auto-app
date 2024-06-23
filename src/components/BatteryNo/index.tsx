'use client'
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button/Button";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from '@mui/joy/Option';
import Stack from "@mui/joy/Stack";
import FormLabel from '@mui/joy/FormLabel';
import { FormEvent, useContext, useState } from "react";
import { incrementAlphaNumericString, incrementAlphaString, incrementNumberString } from "@/utils/fetch";
import { AuthContext } from "@/provider/AuthProvider";
import ListTable from "@/components/ListTable";
import { invoke } from '@tauri-apps/api/tauri'
import { BatteryListItem, InfoContext } from "@/provider/InfoProvider";

export default function BatteryNo() {
    const { token } = useContext(AuthContext);
    const { batteryList, setBatteryListItem } = useContext(InfoContext)
    const [isGarbled, setIsGarbled] = useState('1');
    const [startComplement, setStartComplement] = useState('0000');
    const [startPosition, setStartPosition] = useState("");
    const [batteryNo, setBatteryNo] = useState('');


    const handleStartPosition = (value: string) => {
        const num = +value
        // 非数字

        setStartComplement('');
        setBatteryNo(prev => {
            const fixV = prev.replace(/\s/g, '');
            // 计算新的空格
            const newSpace = num;
            if (newSpace <= fixV.length) {
                setStartPosition((num === 0 ? '' : num) + '');
                // 在startPosition位置处补上空格
                const newBatteryNo = fixV.slice(0, newSpace) + ' ' + fixV.slice(newSpace);

                // 返回新的车牌号
                return newBatteryNo;
            } else {
                return prev
            }
        })
    }
    const handleStartComplement = (value: string, _isGarbled = isGarbled) => {
        if (_isGarbled === "1") {
            // 校验是否为纯数字
            const regex = /^\d+$/;
            if (!regex.test(value)) {
                return;
            }
        }

        if (_isGarbled === "2") {
            // 校验是否为纯字母
            const regex = /^[a-zA-Z]+$/;
            if (!regex.test(value)) {
                return;
            }
        }

        if (_isGarbled === "3") {
            // 校验是否为纯字母数字
            const regex = /^[a-zA-Z0-9]+$/;
            if (!regex.test(value)) {
                return;
            }
        }

        setBatteryNo(prev => {
            // 跳过第一个空格并在startComplement.length 位置处补上第二个空格
            const endIndex = prev.indexOf(' ');
            const ennValue = prev.slice(endIndex).replace(/\s/g, '');
            if (ennValue.length >= value.length || ennValue.length === 0) {
                setStartComplement(value);
            }
            let newEndValue = ennValue
            if (endIndex !== -1) {
                const newSpace = value.length
                newEndValue = ennValue.slice(0, newSpace) + ' ' + ennValue.slice(newSpace);
            }

            const newBatteryNo = prev.slice(0, endIndex) + ' ' + newEndValue;

            // 返回新的车牌号
            return newBatteryNo
        })
    }
    const handleSelectChange = (e: any, newValue: string | null) => {
        if (!newValue) return
        setIsGarbled(newValue);
        setTimeout(() => {
            if (newValue === '2') {
                handleStartComplement('aaaa', newValue);
            } else if (newValue === "1") {
                handleStartComplement('0000', newValue);
            }
        });
    };

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        const batteryNo = formData.get('batteryNo') as string;
        const isGarbled = formData.get('isGarbled') as string;
        const startComplement = formData.get('startComplement') as string;
        const startPosition = formData.get('startPosition') as string;
        const exhaustiveQuantity = formData.get('exhaustiveQuantity') as string;

        if (!exhaustiveQuantity) {
            return
        }
        if (!batteryNo) {
            return
        }
        if (!startPosition) {
            return
        }

        let currentString = startComplement;

        const list = Array.from({ length: Number(exhaustiveQuantity) }).fill(0).map((_, index) => {
            const leftV = batteryNo?.slice(0, Number(startPosition) + 1).replace(/\s/g, '');
            const rightV = batteryNo?.slice(Number(startPosition) + 1 + startComplement.length).replace(/\s/g, '');
            switch (isGarbled) {
                case "1":
                    currentString = incrementNumberString(currentString)
                    break;
                case "2":
                    currentString = incrementAlphaString(currentString)
                    break;
                default:
                    currentString = incrementAlphaNumericString(currentString);
                    break;
            }
            return `${leftV}${currentString}${rightV}`
        })

        const array = await Promise.all(list.map(async (item) => {
            const result = await getBatteryNoFetch(item)
            if (!result) return null
            
            const {
                dcxh,
                dclx,
                dcpp,
                zwpp
            } = result

            const current = {
                value: item,
                status: 'success',
                battery_model: dcxh,
                battery_type: dclx,
                bfn_or_oe: dcpp
            }
            
            setBatteryListItem((prev: BatteryListItem[]) => {
                return [...prev, current]
            })
            return current
        }))
        invoke('find_battery_nums_by_ids', {
            array: array.filter(Boolean).map(item => item!.value)
        });
    }


    async function getBatteryNoFetch(item: string) {
        const response = await fetch('/api/getBatteryInfo', {
            method: "POST",
            body: JSON.stringify({ token, dcbhurl: `https://www.pzcode.cn/pwb/${item}` }),
        })
        const result = await response.json()

        if (result.code === 0) {
            console.log(result.data, 'result.data')
            return result.data
        }
        return null
    }

    const columns: any = [
        { key: 'value', label: '电池码' },
        { key: 'battery_model', label: '电池型号' },
        { key: 'battery_type', label: '电池类型' },
        { key: 'bfn_or_oe', label: '电池品牌' },
    ];

    return (
        <Stack spacing={2} height={'100%'}>
            <form
                onSubmit={onSubmit}
            >
                <Stack spacing={1}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <FormLabel>车架号</FormLabel>
                        <Input required name="batteryNo" value={batteryNo}
                            onChange={(e) => {
                                setBatteryNo(e.target.value ?? null)
                                handleStartPosition("")
                                handleStartComplement('')
                            }} sx={{ flex: 1 }} />
                        <FormLabel>品牌号</FormLabel>
                        <Input name="carBrand" sx={{ flex: 1 }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <FormLabel>开始位置</FormLabel>
                        <Input required name="startPosition" value={startPosition} onChange={(e) => handleStartPosition(e.target.value)} sx={{ flex: 1 }} />
                        <FormLabel>补充码类型</FormLabel>
                        <Select value={isGarbled} onChange={handleSelectChange}>
                            <Option value="1">顺码</Option>
                            <Option value="2">乱码</Option>
                            <Option value="3">随机</Option>
                        </Select>
                        <FormLabel>起始补充码</FormLabel>
                        <Input required name="startComplement" value={startComplement} onChange={(e) => handleStartComplement(e.target.value)} sx={{ flex: 1 }} />
                        <FormLabel>穷举数量</FormLabel>
                        <Input required name="exhaustiveQuantity" sx={{ flex: 1 }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button type="submit" >开始运行</Button>
                    </Box>
                </Stack>
            </form>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <ListTable<BatteryListItem> data={batteryList} columns={columns} />
            </Box>
        </Stack>
    )
}
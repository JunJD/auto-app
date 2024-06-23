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
import { InfoContext } from "@/provider/InfoProvider";
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

export default function CardNum() {
    const { token } = useContext(AuthContext);
    const { cardInfoList, setCardInfoList } = useContext(InfoContext)
    const [isGarbled, setIsGarbled] = useState('1');
    const [startComplement, setStartComplement] = useState('0000');
    const [startPosition, setStartPosition] = useState("");
    const [carNumber, setCarNumber] = useState('');

    
    // 083422211000801

    const handleStartPosition = (value: string) => {
        const num = +value
        // 非数字

        setStartComplement('');
        setCarNumber(prev => {
            const fixV = prev.replace(/\s/g, '');
            // 计算新的空格
            const newSpace = num;
            if (newSpace <= fixV.length) {
                setStartPosition((num === 0 ? '' : num) + '');
                // 在startPosition位置处补上空格
                const newCarNumber = fixV.slice(0, newSpace) + ' ' + fixV.slice(newSpace);

                // 返回新的车牌号
                return newCarNumber;
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

        setCarNumber(prev => {
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

            const newCarNumber = prev.slice(0, endIndex) + ' ' + newEndValue;

            // 返回新的车牌号
            return newCarNumber
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

        const carNumber = formData.get('carNumber') as string;
        const isGarbled = formData.get('isGarbled') as string;
        const startComplement = formData.get('startComplement') as string;
        const startPosition = formData.get('startPosition') as string;
        const exhaustiveQuantity = formData.get('exhaustiveQuantity') as string;

        if (!exhaustiveQuantity) {
            return
        }
        if (!carNumber) {
            return
        }
        if (!startPosition) {
            return
        }

        let currentString = startComplement;

        const list = Array.from({ length: Number(exhaustiveQuantity) }).fill(0).map((_, index) => {
            const leftV = carNumber?.slice(0, Number(startPosition) + 1).replace(/\s/g, '');
            const rightV = carNumber?.slice(Number(startPosition) + 1 + startComplement.length).replace(/\s/g, '');
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
            const result = await getCardNumFetch(item)
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
                bfn_or_oe: dcpp,
                brand: zwpp,
            }
            
            setCardInfoList((prev: ListItem[]) => {
                return [...prev, current]
            })
            return current
        }))
        invoke('find_valid_electro_car_by_ids', {
            array: array.filter(Boolean).map(item => item!.value)
        });
    }


    async function getCardNumFetch(item: string) {
        const response = await fetch('/api/getCarNum', {
            method: "POST",
            body: JSON.stringify({ token, cjhurl: `https://www.pzcode.cn/vin/${item}` }),
        })
        const result = await response.json()

        if (result.code === 0) {
            fetch('/api/getBatteryInfoByCarNum', {
                method: "POST",
                body: JSON.stringify({ cardNum: item }),
            }).then(res => {
                return res.json()
            }).then(result => {
                const { text, url } = result
                let domParser = new DOMParser();
                let doc = domParser.parseFromString(text, "text/html");
                console.log(text)
                const nodes = doc.querySelectorAll(".i-tccc-t")
                const innerTexts = Array.from(nodes).map(node => node.textContent);

                setCardInfoList((prev: ListItem[]) => {
                    return prev.map(pv => {
                        return pv.value === item ? {
                            ...pv,
                            battery_num: innerTexts ? innerTexts[21] ?? '' : '',
                        } : pv
                    })
                })
            })
            return result.data
        }
        return null
    }

    const columns: any = [
        { key: 'value', label: '车架号' },
        { key: 'battery_num', label: '电池码' },
        { key: 'battery_model', label: '电池型号' },
        { key: 'battery_type', label: '电池类型' },
        { key: 'bfn_or_oe', label: '电池品牌' },
        { key: 'brand', label: '中文品牌' },
    ];

    return (
        <Stack spacing={2} height={'100%'}>
            <form
                onSubmit={onSubmit}
            >
                <Stack spacing={1}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <FormLabel>车架号</FormLabel>
                        <Input required name="carNumber" value={carNumber}
                            onChange={(e) => {
                                setCarNumber(e.target.value ?? null)
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
                        <Button>批量下载电池码</Button>
                    </Box>
                </Stack>
            </form>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <ListTable<ListItem> data={cardInfoList} columns={columns} />
            </Box>
        </Stack>
    )
}
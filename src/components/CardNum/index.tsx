'use client'
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button/Button";
import Input from "@mui/joy/Input";
import Select from "@mui/joy/Select";
import Option from '@mui/joy/Option';
import Stack from "@mui/joy/Stack";
import FormLabel from '@mui/joy/FormLabel';
import { FormEvent, useContext, useRef, useState } from "react";
import { incrementAlphaNumericString, incrementAlphaString, incrementNumberString } from "@/utils/fetch";
import { AuthContext } from "@/provider/AuthProvider";
import ListTable from "@/components/ListTable";
import { invoke } from '@tauri-apps/api/tauri'
import { CarListItem, InfoContext } from "@/provider/InfoProvider";
import { pauseFetchQueue, customFetch as fetch, fetchBashUrlList } from '@/utils/FetchQueue';

const columns: any = [
    { key: 'value', label: '车架号' },
    { key: 'batteryNum', label: '电池码' },
    { key: 'battery_type', label: '电池类型' },
    { key: 'bfn_or_oe', label: '电池品牌' },
    { key: 'batteryCapacity', label: '电池容量' },
];

export default function CardNum() {
    const [loading, setLoading] = useState(false);
    const { token } = useContext(AuthContext);
    const { cardInfoList, setCardInfoList } = useContext(InfoContext)
    const [isGarbled, setIsGarbled] = useState('1');
    const [startComplement, setStartComplement] = useState('0000');
    const [startPosition, setStartPosition] = useState("");
    const [carNumber, setCarNumber] = useState('');
    const [errNum, setNumber] = useState(0);
    const cacheData = useRef<CarListItem[]>([]);

    const pause = () => {
        pauseFetchQueue();
        setTimeout(() => {
            invoke('my_generate_excel_command', {
                tableData: {
                    data: cacheData.current,
                    columns: [
                        ...columns,
                        { key: 'dcscqy', label: '蓄电池生产企业' },
                        { key: 'dcxh', label: '蓄电池型号' },
                        { key: 'cjsj', label: '生产日期' },
                    ]
                },
                folderNameString: '车架号',
                xlsxFilePathString: '车架号'
            }).finally(() => {
                setLoading(false)
            })
        }, 1000);
    }

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
            if (!regex.test(value) && value) {
                return;
            }
        }

        if (_isGarbled === "2") {
            // 校验是否为纯字母
            const regex = /^[a-zA-Z]+$/;
            if (!regex.test(value) && value) {
                return;
            }
        }

        if (_isGarbled === "3") {
            // 校验是否为纯字母数字
            const regex = /^[a-zA-Z0-9]+$/;
            if (!regex.test(value) && value) {
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
                handleStartComplement('AAAA', newValue);
            } else if (newValue === "1") {
                handleStartComplement('0000', newValue);
            }
        });
    };

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setNumber(0)
        setLoading(true)
        const formData = new FormData(event.currentTarget);

        const isFlag = formData.get('isFlag') as string;
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

        setCardInfoList([])

        const resolveList: Promise<CarListItem | null>[] = []

        const list = []

        for (const _ of Array.from({ length: Number(exhaustiveQuantity) }).fill(0)) {
            const leftV = carNumber?.slice(0, Number(startPosition) + 1).replace(/\s/g, '');
            const rightV = carNumber?.slice(Number(startPosition) + 1 + startComplement.length).replace(/\s/g, '');
            let current = ''
            switch (isGarbled) {
                case "1":
                    current = incrementNumberString(currentString) ?? ''
                    break;
                case "2":
                    current = incrementAlphaString(currentString) ?? ''
                    break;
                default:
                    current = incrementAlphaNumericString(currentString) ?? '';
                    break;
            }

            if (current) {
                currentString = current
                const item = `${leftV}${currentString}${rightV}`
                list.push(item)
            } else {
                break
            }
        }

        for (const item of list) {
            resolveList.push(new Promise<CarListItem | null>(async (resolve) => {
                try {
                    let result = await getCardNumFetch(item, isFlag === "1")
                    let current: CarListItem = {
                        status: 'pending',
                        value: item,
                    }

                    if (result.code !== 0) {
                        current = {
                            status: result.msg ?? '校验没通过',
                            value: item,
                        }
                        setCardInfoList((prev: CarListItem[]) => {
                            return [current, ...prev]
                        })
                        setNumber(prev => prev + 1)
                        resolve(current)
                        return
                    }

                    current = {
                        ...result.data,
                        value: item,
                        status: 'success',
                        // batteryModel: dcxh,
                        battery_type: result.data!.dclx,
                        bfn_or_oe: result.data!.dcpp,
                        // brand: result.data!.zwpp,
                        batteryCapacity: result.data!.dcrl,
                        battery_num: result.data!.batteryNum,
                    }

                    setCardInfoList((prev: CarListItem[]) => {
                        return [current, ...prev]
                    })
                    cacheData.current.push(current)
                    resolve(current)
                } catch (error) {
                    const current = {
                        status: '超时或者取消了',
                        value: item,
                    }
                    setCardInfoList((prev: CarListItem[]) => {
                        return [current, ...prev]
                    })
                    setNumber(prev => prev + 1)
                    resolve(null)
                }
            }))
        }
        await Promise.all(resolveList)
        if (cacheData.current.length) {
            invoke('my_generate_excel_command', {
                tableData: {
                    data: cacheData.current,
                    columns: [
                        ...columns,
                        { key: 'dcscqy', label: '蓄电池生产企业' },
                        { key: 'dcxh', label: '蓄电池型号' },
                        { key: 'cjsj', label: '生产日期' },
                    ]
                },
                folderNameString: '车架号',
                xlsxFilePathString: '车架号'
            }).finally(() => {
                setLoading(false)
            })
        } else {
            setLoading(false)
        }
    }

    const baseUrlIndex = useRef(0)
    function getBaseUrl() {
        if (baseUrlIndex.current >= fetchBashUrlList.length) {
            baseUrlIndex.current = 0
        }
        return fetchBashUrlList[baseUrlIndex.current++]
    }

    async function getCardNumFetch(item: string, flag: boolean) {
        if (flag) {
            try {
                const response: any = await fetch(`https://www.pzcode.cn/vin/${item}`, {
                    method: "GET",
                    responseType: 'text'
                }, 1)
                console.log('response', response)
                const text = response.data as string

                if(text.includes('404:页面未找到')) {
                    return {
                        code: 1,
                        msg: '没有找到该车架号',
                        data: {
                            
                        }
                    }
                }

                let domParser = new DOMParser();
                let doc = domParser.parseFromString(text, "text/html");


                const nodes = Array.from(doc.querySelectorAll('.i-tccc-t'))
                
                
                const result = nodes.map((item => {
                    const trim = item.textContent?.replace(/\s+/g, "")
                    return (trim?.split('：'))
                })).filter(item => item && item?.length >= 2)
                const data = Object.fromEntries(result as Array<any>)
                

                const innerTexts = nodes.map(node => node.textContent && node.textContent.trim()).filter(it => it && it?.includes('电池编号'));
                const batteryNum = innerTexts[0]?.replace(/\s+/g, ' ')

                return { code: 0, msg: 'success', data: { 
                    batteryNum,
                    value: item,
                    status: 'success',
                    dcxh: data["蓄电池型号"],
                    dclx: data["蓄电池类型"],
                    dcpp: data["蓄电池生产企业"],
                    dcscqy: data["蓄电池生产企业"],
                    dcrl: data["蓄电池容量（Ah）"],
                    cjsj: data["生产日期"],
                    URL: `https://www.pzcode.cn/vin/${item}`
                 } }
            } catch (error) {
                return { msg: `网址访问失败 https://www.pzcode.cn/vin/${item} `, code: 1, data: {
                    value: item,
                    status: 'error',
                } }
            }
        }
        return { msg: `必须也查电池码`, code: 1 }
    }

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
                        <FormLabel>是否找电池码</FormLabel>
                        <Select name="isFlag" sx={{ flex: 1 }} defaultValue={'1'}>
                            <Option value="1">需要</Option>
                            <Option value="2">不需要</Option>
                        </Select>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <FormLabel>开始位置</FormLabel>
                        <Input required name="startPosition" value={startPosition} onChange={(e) => handleStartPosition(e.target.value)} sx={{ flex: 1 }} />
                        <FormLabel>补充码类型</FormLabel>
                        <Select name="isGarbled" value={isGarbled} onChange={handleSelectChange}>
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
                        <Button type="submit" loading={loading}>开始运行</Button>
                        <Button onClick={pause} disabled={!loading}>暂停当前运行</Button>
                        <Stack spacing={10} direction='row'>
                            <span>当前有效数量： {cardInfoList.filter(it => it.status === 'success').length}</span>
                            <span>当前无效数量： {errNum}</span>
                        </Stack>
                    </Box>
                </Stack>
            </form>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <ListTable<CarListItem> data={cardInfoList} columns={[...columns, { key: 'status', label: '状态' }]} />
            </Box>
        </Stack>
    )
}
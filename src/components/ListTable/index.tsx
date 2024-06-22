'use client'

import React, { useState, useCallback, useEffect } from 'react';
import Table from '@mui/joy/Table';
import useLazyLoad from '@/hooks/useLazyLoad';

interface ListTableProps<T> {
    data: T[];
    columns: Array<{ key: keyof T; label: string }>;
    fetchMoreData?: () => void;
}

const ListTable = <T,>({ data, columns, fetchMoreData }: ListTableProps<T>) => {
    const [displayData, setDisplayData] = useState(data.slice(0, 20)); // 初始显示数据

    useEffect(() => {
        setDisplayData(data.slice(0, 20));
    }, [data]);


    const loadMoreRef = useLazyLoad(() => {
        const moreData = data.slice(displayData.length, displayData.length + 20);
        setDisplayData((prev) => [...prev, ...moreData]);
        fetchMoreData && fetchMoreData();
    });

    return (
        <Table aria-label="dynamic table" stickyHeader>
            <thead>
                <tr>
                    {columns.map((column, index) => (
                        <th key={index}>{column.label}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {
                    displayData.map((item, index) => {
                        return (
                            <tr key={index}>
                                {columns.map((column, colIndex) => (
                                    <td key={colIndex}>{(item as any)[column.key]}</td>
                                ))}
                            </tr>
                        );
                    })
                }
                <tr ref={loadMoreRef}>
                    <td colSpan={columns.length}>...</td>
                </tr>
            </tbody>
        </Table>
    );
};

export default ListTable;

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ShoppingListItemProps = {
    name: string;
    amount: string;
    group: string;
};

export function ShoppingListItem({ name, amount, group }: ShoppingListItemProps) {
    return (
        <View style={styles.row}>
            <View style={styles.leftRow}>
                <Pressable style={styles.checkCircle} />
                <View>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.group}>{group}</Text>
                </View>
            </View>
            <Text style={styles.amount}>{amount}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E8ECF2',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    leftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    checkCircle: {
        width: 18,
        height: 18,
        borderRadius: 99,
        borderWidth: 1.5,
        borderColor: '#B8C2CF',
        backgroundColor: '#F8FAFC',
    },
    name: {
        color: '#1F2937',
        fontSize: 14,
        fontWeight: '600',
    },
    group: {
        marginTop: 1,
        color: '#7A8594',
        fontSize: 11,
        fontWeight: '500',
    },
    amount: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '600',
    },
});
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { setTokenSourceMapRange } from 'typescript';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
    children: ReactNode;
}

interface UpdateProductAmount {
    productId: number;
    amount: number;
}

interface CartContextData {
    cart: Product[];
    addProduct: (productId: number) => Promise<void>;
    removeProduct: (productId: number) => void;
    updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
    const [cart, setCart] = useState<Product[]>(() => {
        const storagedCart = localStorage.getItem('@RocketShoes:cart');

        if (storagedCart) {
            return JSON.parse(storagedCart);
        }

        return [];
    });

    const addProduct = async (productId: number) => {
        try {
            const newCart = [...cart];
            const productExists = newCart.find(product => product.id === productId);

            const stock = await api.get(`stock/${productId}`);

            const stockAmount = stock.data.amount;
            const currentAmount = productExists ? productExists.amount : 0;
            const amount = currentAmount + 1;

            if (amount > stockAmount) {
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            if (productExists) {
                productExists.amount = amount;
            } else {
                const response = await api.get(`products/${productId}`);
                const newProduct = {
                    ...response.data,
                    amount
                };
                newCart.push(newProduct);
            }

            setCart(newCart);

            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        } catch {
            toast.error('Erro na adição do produto');
        }
    };

    const removeProduct = (productId: number) => {
        try {
            const product = cart.find(product => product.id === productId);

            if (!product) {
                throw new Error("Product not found");
            }

            const newCart = cart.filter(product => product.id !== productId);

            setCart(newCart);

            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        } catch {
            toast.error('Erro na remoção do produto');
        }
    };

    const updateProductAmount = async ({
        productId,
        amount,
    }: UpdateProductAmount) => {
        try {
            if (amount <= 0) {
                return;
            }

            const response = await api.get(`stock/${productId}`);
            const stock = response.data;
            const hasStock = stock && stock.amount >= amount;

            if (!hasStock) {
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            const newCart = [...cart];
            const product = newCart.find(product => product.id === productId);

            if (product) {
                product.amount = amount;
            } else {
                const response = await api.get(`products/${productId}`);
                const product = response.data;
                newCart.push({
                    ...product,
                    amount
                });
            }

            setCart(newCart);

            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        } catch {
            toast.error('Erro na alteração de quantidade do produto');
        }
    };

    return (
        <CartContext.Provider
            value={{ cart, addProduct, removeProduct, updateProductAmount }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextData {
    const context = useContext(CartContext);

    return context;
}

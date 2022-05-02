import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    /*
      Deve verificar se existe algum registro com o valor `@RocketShoes:cart` 
      e retornar esse valor caso existir. 
      Caso contrário, retornar um array vazio.
    */

    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  /*
    Deve adicionar um produto ao carrinho. Porém, é preciso verificar algumas coisas:

    * O valor atualizado do carrinho deve ser perpetuado no localStorage utilizando o método setItem
    * Caso o produto já exista no carrinho, não se deve adicionar um novo produto repetido, 
    apenas incrementar em 1 unidade a quantidade;
    * Verificar se existe no estoque a quantidade desejada do produto. 
    Caso contrário, utilizar o método error da react-toastify com a seguinte mensagem:
    toast.error('Quantidade solicitada fora de estoque');
    * Capturar utilizando trycatch os erros que ocorrerem ao longo do método e, no catch, 
    utilizar o método error da react-toastify com a seguinte mensagem:
    toast.error('Erro na adição do produto');
  */

  const addProduct = async (productId: number) => {
    try {
      const { amount: stockAmount } = (
        await api.get<Stock>(`/stock/${productId}`)
      ).data;

      const newCart = [...cart];

      const productExitsInCart = newCart.find(
        (product) => product.id === productId
      );

      if (productExitsInCart) {
        if (productExitsInCart.amount < stockAmount) {
          productExitsInCart.amount += 1;
        } else {
          toast.error("Quantidade solicitada fora de estoque");

          return;
        }
      } else {
        const product = (await api.get<Product>(`/products/${productId}`)).data;

        newCart.push({ ...product, amount: 1 });
      }

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  /*
    Deve remover um produto do carrinho. Porém, é preciso verificar algumas coisas:

    * O valor atualizado do carrinho deve ser perpetuado no localStorage utilizando o método setItem.
    * Capturar utilizando trycatch os erros que ocorrerem ao longo do método e, 
    no catch, utilizar o método error da react-toastify com a seguinte mensagem:
    toast.error('Erro na remoção do produto');
  */

  const removeProduct = (productId: number) => {
    try {
      if (!cart.find((cartProduct) => cartProduct.id === productId)) {
        throw new Error("Produto não encontrado");
      }

      const newCart = cart.filter((p) => p.id !== productId);

      setCart(newCart);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));

      toast.success("Produto removido do carrinho");
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  /*
    Deve atualizar a quantidade de um produto no carrinho. Porém, é preciso verificar algumas coisas:

    * O valor atualizado do carrinho deve ser perpetuado no localStorage utilizando o método setItem.
    * Se a quantidade do produto for menor ou igual a zero, sair da função updateProductAmount instantaneamente.
    * Verificar se existe no estoque a quantidade desejada do produto. 
    Caso contrário, utilizar o método error da react-toastify com a seguinte mensagem:
    toast.error('Quantidade solicitada fora de estoque');
    * Capturar utilizando trycatch os erros que ocorrerem ao longo do método e, no catch, utilizar o método error da react-toastify com a seguinte mensagem:
    toast.error('Erro na alteração de quantidade do produto');
  */

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        throw new Error("Quantidade inválida");
      }

      const { amount: stockAmount } = (
        await api.get<Stock>(`/stock/${productId}`)
      ).data;
      const productExistsInCart = cart.findIndex(
        (product) => product.id === productId
      );

      if (productExistsInCart < 0) {
        throw new Error("Produto não encontrado");
      }

      const newCart = [...cart];

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
      } else {
        newCart[productExistsInCart].amount = amount;

        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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

const { response } = require("express");
const express = require("express");
const { v4: uuidv4 } = require("uuid")// 8.3k (gzipped: 3.5k)

const app = express();

app.use(express.json());

const clientes = [];

// Middleware
function verificaContaExistenteCPF(requisicao, resposta, proximo){
    const { cpf } = requisicao.headers;

    const cliente = clientes.find((cliente) => cliente.cpf === cpf);

    //Se o cliente não existir
    if(!cliente){
        return resposta.status(400).json({ erro: "cliente não encontrado"});
    }

    requisicao.cliente = cliente;

    return proximo();
}

function fazBalanço(extrato){
    const balanco = extrato.reduce((acumulador, operacao) => {
        if(operacao.tipo === 'credito'){
            return acumulador + operacao.quantidade;
        }else{
            return acumulador - operacao.quantidade;
        }
    }, 0);

    return balanco;
}

//cria uma conta
app.post("/conta", (requisicao, resposta) => {
    const { cpf, nome } = requisicao.body;

    const clienteJaExiste = clientes.some((cliente) => cliente.cpf === cpf);

    if(clienteJaExiste){
        return resposta.status(400).json({erro: "Cliente já existe"})
    }

    clientes.push({
        cpf,
        nome,
        id: uuidv4(),
        extrato: []
    });

    return resposta.status(201).send();
});

//app.use(verificaContaExistenteCPF);

//buscar saldo
app.get("/extrato", verificaContaExistenteCPF, (requisicao, resposta) => {
    const { cliente } = requisicao;
    return resposta.json(cliente.extrato);
});

//deposito
app.post("/deposito", verificaContaExistenteCPF, (requisicao, resposta) => {
    const { descricao, quantidade } = requisicao.body;
    
    const { cliente } = requisicao;

    const operacaoExtrato = {
        descricao,
        quantidade,
        criado_em: new Date(),
        tipo: "credito"
    }

    cliente.extrato.push(operacaoExtrato);

    return resposta.status(201).send();
});

//saque
app.post("/saque", verificaContaExistenteCPF, (requisicao, resposta) => {
    const { quantidade } = requisicao.body;
    const { cliente } = requisicao;

    const balanco = fazBalanço(cliente.extrato);

    if(balanco < quantidade){
        return resposta.status(400).json({ Erro: "Fundos insuficiente",
    quantidade: quantidade,
    balanco: balanco});
    }

    const operacaoExtrato = {
        descricao,
        quantidade,
        criado_em: new Date(),
        tipo: "debit"
    }

    cliente.extrato.push(operacaoExtrato);

    return resposta.status(201).send();
});

app.listen(5000);
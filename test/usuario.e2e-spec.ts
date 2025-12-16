import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('Testes dos módulos Usuario e Auth (e2e)', () => {
  let usuarioId: number;
  let token: string;

  let app: INestApplication<App>;
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + './../src/**/entities/*.entity.ts'],
          synchronize: true,
          dropSchema: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1 - Deve cadastrar um novo Usuario', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/usuarios/cadastrar')
      .send({
        nome: 'Murilo',
        usuario: 'murilo@email.com',
        senha: 'murilo123',
        foto: 'https://i.imgur.com/zEM4Z3S.jpeg',
      })
      .expect(201);

    usuarioId = (resposta.body as { id: number }).id;
  });

  it('2 - Não deve cadastrar um Usuario duplicado', async () => {
    await request(app.getHttpServer())
      .post('/usuarios/cadastrar')
      .send({
        nome: 'Murilo',
        usuario: 'murilo@email.com',
        senha: 'murilo123',
        foto: 'https://i.imgur.com/zEM4Z3S.jpeg',
      })
      .expect(400);
  });

  it('3 - Deve autenticar o Usuario (Login)', async () => {
    const reposta = await request(app.getHttpServer())
      .post('/usuarios/logar')
      .send({
        usuario: 'murilo@email.com',
        senha: 'murilo123',
      })
      .expect(200);

    token = (reposta.body as { token: string }).token;
  });

  it('4 - Deve listar todos os usuários', async () => {
    return request(app.getHttpServer())
      .get('/usuarios/all')
      .set('Authorization', token)
      .send({})
      .expect(200);
  });

  it('5 - Deve atualizar um Usuario', async () => {
    return request(app.getHttpServer())
      .put('/usuarios/atualizar')
      .set('Authorization', token)
      .send({
        id: usuarioId,
        nome: 'Murilo atualizado',
        usuario: 'murilo-atualizado@email.com',
        senha: 'murilo456',
        foto: 'https://i.imgur.com/zEM4Z3S.jpeg',
      })
      .expect(200)
      .then((resposta) => {
        const body = resposta.body as {
          nome: string;
          usuario: string;
          senha: string;
        };

        expect(body.nome).toEqual('Murilo atualizado');
        expect(body.usuario).toEqual('murilo-atualizado@email.com');
        //expect(body.senha).toEqual('murilo456'); aqui vai gerar a criptografia
        expect(body.senha).not.toEqual('murilo456');
      });
  });

  it('6 - Não deve permitir listar usuários sem token', async () => {
    await request(app.getHttpServer()).get('/usuarios/all').expect(401);
  });

  it('7 - Não deve atualizar usuário inexistente', async () => {
    await request(app.getHttpServer())
      .put('/usuarios/atualizar')
      .set('Authorization', token)
      .send({
        id: 9999,
        nome: 'Teste',
        usuario: 'teste@email.com',
        senha: '123456',
      })
      .expect(400);
  });

  it('6 - Deve excluir um Usuario', async () => {
    await request(app.getHttpServer())
      .delete(`/usuarios/${usuarioId}`)
      .set('Authorization', token)
      .expect(404);
  });

  it('7 - Não deve excluir um Usuario inexistente', async () => {
    await request(app.getHttpServer())
      .delete('/usuarios/9999')
      .set('Authorization', token)
      .expect(404);
  });
});

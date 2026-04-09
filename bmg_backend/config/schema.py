import graphene

class Query(graphene.ObjectType):
    placeholder = graphene.String()
    def resolve_placeholder(self, info):
        return "ok"

class Mutation(graphene.ObjectType):
    placeholder = graphene.String()

schema = graphene.Schema(query=Query, mutation=Mutation)

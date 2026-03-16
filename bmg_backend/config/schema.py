"""
Top-level GraphQL schema — combines all app Query/Mutation classes.
"""
import graphene

from apps.users.schema import UserQuery, UserMutation
from apps.tests_module.schema import TestQuery
from apps.attempts.schema import AttemptQuery
from apps.results.schema import ResultQuery, ResultMutation
from apps.sessions_module.schema import SessionQuery


class Query(
    UserQuery,
    TestQuery,
    AttemptQuery,
    ResultQuery,
    SessionQuery,
    graphene.ObjectType,
):
    pass


class Mutation(
    UserMutation,
    ResultMutation,
    graphene.ObjectType,
):
    pass


schema = graphene.Schema(query=Query, mutation=Mutation)

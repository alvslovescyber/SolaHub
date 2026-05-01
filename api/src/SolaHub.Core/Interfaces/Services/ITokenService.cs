using SolaHub.Core.Entities;

namespace SolaHub.Core.Interfaces.Services;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
}
